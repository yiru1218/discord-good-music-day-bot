require('dotenv').config(); // 加載 .env 文件中的變數
const { DISCORD_BOT_TOKEN, FFMPEG_PATH } = process.env;

const { Client, GatewayIntentBits, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  plugins: [new YtDlpPlugin({ update: true })],
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
      // 記錄抓音樂開始時間
      const addListStartTime = Date.now();
      console.log('開始抓音樂:', new Date(addListStartTime).toLocaleTimeString());
    
      try {
        await distube.play(message.member.voice.channel, url, {
          member: message.member,
          textChannel: message.channel,
          message
        });
      } catch (error) {
        if (error.errorCode === 'YTDLP_ERROR') {
          console.log('抓音樂失敗', new Date(addListStartTime).toLocaleTimeString());
          return;
        }
      }

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
      // 回覆新的播放列表
      const newQueue = queue.songs.map((song, index) =>
        `**${index + 1}**. [${song.name}](${song.url}) - \`${song.formattedDuration}\``
      ).slice(0, 10).join('\n');

      message.channel.send(`🔀 新的播放順序：\n${newQueue}`);
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

const createProgressBar = (currentTime, duration, barLength = 20) => {
  const progress = Math.round((currentTime / duration) * barLength);
  const remaining = barLength - progress;
  return '█'.repeat(progress) + '░'.repeat(remaining);
};

const createEmbed = (song, currentTime = 0) => {
  const elapsedMinutes = Math.floor(currentTime / 60);
  const elapsedSeconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
  const elapsed = `${elapsedMinutes}:${elapsedSeconds}`;

  return new EmbedBuilder()
    .setColor('#1DB954') // Spotify 綠色
    .setTitle(`🎶 ${song.name}`)
    .addFields(
      { name: '🔊', value: ` ${elapsed} / ${song.formattedDuration}` },
      // { name: '🔊 進度條', value: `\`\`\`${progressBar}\`\`\`` }
    )
    .setThumbnail(song.thumbnail);
};

const updateMessage = async (queue, message, buttons) => {
  const currentSong = queue.songs[0];
  const currentTime = queue.currentTime;
  // const progressBar = createProgressBar(currentTime, currentSong.duration);

  const embed = createEmbed(currentSong, currentTime);

  await message.edit({ embeds: [embed], components: [buttons] });
};

distube
  .on('playSong', async (queue, song) => {
    // const voiceChannel = queue.voiceChannel || queue.member.voice.channel; // 從 queue 中獲取語音頻道
    // const songName = song.name.length > 20 ? song.name.slice(0, 20) + '...' : song.name;
    // try {
    //   await client.user.setActivity(`🎶 ${song.name}`, { type: 'LISTENING' });
    //   console.log(`機器人狀態已更新為: 正在播放 ${song.name}`);
    // } catch (error) {
    //   console.error(`無法更新機器人狀態: ${error}`);
    // }
    console.log(`正在播放: ${song.name}`);
    // if (message) {
    //   await updateEmbedMsg(queue);
    // }
  })

  .on('addList', async (queue, playlist) => {
    const playTime = Date.now();
    console.log('抓完音樂:', new Date(playTime).toLocaleTimeString());

    const firstSong = playlist.songs[0];
    // const progressBar = createProgressBar(0, firstSong.duration);
    const embed = createEmbed(firstSong, 0);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('下一首')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('refresh')
        .setLabel('更新')
        .setStyle(ButtonStyle.Primary),

    );

    const message = await queue.textChannel.send({ embeds: [embed], components: [buttons] });

    // 按鈕交互處理邏輯
    const filter = i => ['refresh', 'next'].includes(i.customId);
    const collector = message.createMessageComponentCollector({ filter });

    collector.on('collect', async i => {
      if (i.customId === 'refresh') {
        await updateMessage(queue, message, buttons);
        await i.update({});
      }
      if (i.customId === 'next') {
        try {
          // 跳過到下一首
          await queue.skip();

          // 跳過到下一首後，立即刷新嵌入消息
          await updateMessage(queue, message, buttons);
          await i.update({});
        } catch (error) {
          console.error('跳到下一首時發生錯誤:', error);
          await i.update({});
        }
      }
    });
  })

  .on('error', (queue, error) => {
    console.error(`播放清單或歌曲時發生錯誤: ${error.message}`);
    queue.textChannel?.send(`播放清單中的某首歌曲發生錯誤: ${error.message}`);
    
    // 自動跳過錯誤歌曲
    const song = queue.songs[0];
    if (song) {
      queue.textChannel?.send(`正在跳過發生錯誤的歌曲: ${song.name}`);
      try {
        distube.skip(queue);
      } catch (err) {
        console.error('跳過歌曲時發生錯誤:', err);
        queue.textChannel?.send('無法跳過該歌曲，可能需要手動干預。');
      }
    }
  });


// 登入機器人
client.login(DISCORD_BOT_TOKEN);
