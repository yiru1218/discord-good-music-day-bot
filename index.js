require('dotenv').config(); // 加載 .env 文件中的變數
const { DISCORD_BOT_TOKEN, FFMPEG_PATH } = process.env;

const { Client, GatewayIntentBits, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const ytSearch = require('yt-search'); // 引入 yt-search 模組

const ffmpeg = require('@ffmpeg-installer/ffmpeg'); // 引用 ffmpeg 模組
// const { generateDependencyReport } = require('@discordjs/voice');
// console.log(generateDependencyReport());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});


// 初始化 DisTube
const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin()],
  ffmpeg: {
    path: FFMPEG_PATH
  }
});

client.once('ready', async () => {
  console.log(`${client.user.tag} 已上線！`);

  // const commands = [
  //   {
  //     name: 'play',
  //     description: '播放音樂',
  //     options: [
  //       {
  //         name: 'query',
  //         type: 3, // String type
  //         description: '輸入要播放的音樂名稱或網址',
  //         required: true
  //       }
  //     ]
  //   },
  //   {
  //     name: 'skip',
  //     description: '跳過當前播放的歌曲'
  //   },
  //   {
  //     name: 'queue',
  //     description: '顯示播放列表'
  //   }
  // ];

  // try {
  //   console.log('Started refreshing application (/) commands.');

  //   await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  //   console.log('Successfully reloaded application (/) commands.');
  // } catch (error) {
  //   console.error(error);
  // }
});

// 音樂播放指令
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.split(' ');
  const command = args.shift();
  const input = args.join(' '); // 重新組合命令後的參數

  if (command === '!play') {
    let url;
    if (input.startsWith('http')) {
      url = input; // 如果是 URL，則直接使用
    } else {
      // 使用 yt-search 進行搜尋
      const results = await ytSearch(input);
      if (results.videos.length > 0) {
        // 建立選擇menu
        const options = results.videos.map((video, index) => ({
          label: video.title.length > 50 ? video.title.slice(0, 50) + '...' : video.title, // 確保標籤不超過 25 個字符
          value: video.url,
          description: `${video.duration.timestamp}`
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('songSelect')
          .setPlaceholder('請選擇一首歌曲')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await message.channel.send({ content: '找到以下歌曲，請選擇：', components: [row] });
        // 顯示搜尋結果
        // const songs = results.videos.map((video, index) => `**${index + 1}**: ${video.title}`).join('\n');
        // message.channel.send(`找到以下歌曲：\n${songs}\n請輸入數字來選擇要播放的歌曲。`);

        // 等待用戶輸入
        const filter = i => i.customId === 'songSelect' && i.user.id === message.author.id;
        const collected = await message.channel.awaitMessageComponent({ filter, time: 30000 }).catch(() => {
          // message.reply('選擇超時！');
        });

        if (collected) {
          url = collected.values[0];
          selectedTitle = options.find(option => option.value === url).label;
          await collected.reply({ content: `已選擇歌曲: ${selectedTitle}`, ephemeral: true }); // ephemeral只有sender看的到
        }

      } else {
        message.reply('找不到任何音樂。');
        return;
      }
    }

    if (url && message.member.voice.channel) {
      distube.play(message.member.voice.channel, url, {
        member: message.member,
        textChannel: message.channel,
        message
      });
    } else {
      message.reply('你需要先加入語音頻道！');
    }
  }

  if (command === '!skip') {
    const queue = distube.getQueue(message);
    if (!queue) {
      // message.reply('目前沒有正在播放的音樂！');
      return;
    }
    distube.skip(message); // 跳過當前歌曲
    // message.reply('已跳過當前歌曲！');
  }

  if (command === '!shuffle') {
    const queue = distube.getQueue(message);
    if (!queue) {
      message.reply('目前沒有任何歌曲在播放！');
    } else {
      distube.shuffle(queue); // 使用 shuffle 方法打亂隊列
    }
  }

  if (command === '!queue') {
    const queue = distube.getQueue(message)
    if (!queue) {
      message.channel.send('Nothing playing right now!')
    } else {
      message.channel.send(
        `Current queue:\n${queue.songs
          .map(
            (song, id) =>
              `**${id ? id : 'Playing'}**. ${song.name
              } - \`${song.formattedDuration}\``,
          )
          .slice(0, 10)
          .join('\n')}`,
      )
    }
  }
});

// 當音樂播放完成時通知
distube.on('finish', async (queue) => {
  // 當前歌曲播放完成，且隊列為空時自動選擇下一首歌曲
  queue.textChannel.send('Nothing playing right now!');

  // 確保之前播放的歌曲存在，並且只在隊列完全播放完畢時才推薦
  
});


distube
  .on('playSong', async (queue, song) => {
    // const voiceChannel = queue.voiceChannel || queue.member.voice.channel; // 從 queue 中獲取語音頻道
    // const songName = song.name.length > 20 ? song.name.slice(0, 20) + '...' : song.name;
    
    console.log(`正在播放: ${song.name}`);
  })

  .on('addList', (queue, playlist) => {
    console.log(`添加播放清單: ${playlist.name}`);
  })

  .on('error', (channel, error) => {
    console.error(`播放時發生錯誤: ${error}`);
  });

// 登入機器人
client.login(DISCORD_BOT_TOKEN);
