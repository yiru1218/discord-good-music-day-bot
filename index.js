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
let idleTimeout;


// 初始化 DisTube
const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin({ update: true})],
  ffmpeg: {
    path: FFMPEG_PATH
  }
});

client.once('ready', async () => {
  console.log(`${client.user.tag} 已上線！`);
  // 啟動時檢查是否有播放隊列，如果沒有則自動播放預設影片
  // 啟動時設置30秒計時器，如果沒有播放任何音樂，則自動播放預設影片
  idleTimeout = setTimeout(async () => {
    const guilds = client.guilds.cache;
    guilds.forEach(async (guild) => {
      const voiceChannel = guild.members.me?.voice.channel;
      if (voiceChannel && !distube.getQueue(guild.id)) {
        try {
          await distube.play(voiceChannel, 'https://www.youtube.com/watch?v=NZoXV828Suo&pp=ygUN5aSa57Gz5aSa576FIA%3D%3D', {
            textChannel: guild.channels.cache.find(channel =>
              channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
            ),
          });
          console.log('啟動30秒後沒有播放音樂，自動播放預設影片。');
        } catch (error) {
          console.error('自動播放影片時發生錯誤:', error);
        }
      }
    });
  }, 60000); // 設定為 30 秒
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
        console.log(error)
        if (error.errorCode === 'YTDLP_ERROR') {
          message.reply({ content: '抓音樂失敗！', ephemeral: true });
        }
      }

    } else {
      message.reply('你需要先加入語音頻道！');
    }
  }

  if (command === '!insert') {
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

    const queue = distube.getQueue(message);

    try {
      const addListStartTime = Date.now();
      console.log('開始抓音樂:', new Date(addListStartTime).toLocaleTimeString());
      if (!queue) {
        // 如果沒有播放清單，直接播放歌曲
        await distube.play(message.member.voice.channel, url, {
          member: message.member,
          textChannel: message.channel,
          message
        });
      } else {
        // 若已有播放清單，則插入到最前面
        await distube.play(message.member.voice.channel, url, {
          position: 1, // 插入到最前面
          member: message.member,
          textChannel: message.channel,
          message
        });
      }
    } catch (error) {
      console.error('插入歌曲時發生錯誤:', error);
      message.reply({ content: '插入歌曲失敗！', ephemeral: true });
    }
  }

  if (command === '!skip') {
    const queue = distube.getQueue(message);
    if (!queue) {
      // message.reply('目前沒有正在播放的音樂！');
      return;
    }

    try {
      if (queue.songs.length > 1) {
        await distube.skip(message);
      } else {
        // 如果沒有下一首歌曲，停止播放
        await distube.stop(message);
      }
    } catch (error) {
      console.error('跳到下一首時發生錯誤:', error);
      // message.reply('無法跳過歌曲，可能需要手動干預。');
    }
  }

  // if (command === '!shuffle') {
  //   const queue = distube.getQueue(message);
  //   if (!queue) {
  //     message.reply('目前沒有任何歌曲在播放！');
  //   } else {
  //     distube.shuffle(queue); // 使用 shuffle 方法打亂隊列
  //     // 回覆新的播放列表
  //     const newQueue = queue.songs.map((song, index) =>
  //       `**${index + 1}**. [${song.name}](${song.url}) - \`${song.formattedDuration}\``
  //     ).slice(0, 10).join('\n');

  //     message.channel.send(`🔀 新的播放順序：\n${newQueue}`);
  //   }
  // }

  if (command === '!queue') {
    const queue = distube.getQueue(message);

    if (!queue || queue.songs.length === 0) {
      await message.channel.send('目前沒有正在播放的音樂！');
      return;
    }

    const pageSize = 10; // 每頁顯示的歌曲數量
    let currentPage = 0;
    const totalPages = Math.ceil(queue.songs.length-1 / pageSize);

    // 生成清單嵌入
    const createQueueEmbed = (page) => {
      const currentQueue = distube.getQueue(message);
      const start = page * pageSize;
      const end = start + pageSize;
      const songs = currentQueue.songs.slice(start, end).slice(1);

      return new EmbedBuilder()
        .setTitle('🎵 待播清單')
        .setDescription(
          songs
            .map(
              (song, index) =>
                `**${start + index + 1}**. [${song.name}](${song.url}) - \`${song.formattedDuration}\``
            )
            .join('\n')
        )
        .setColor('#1DB954')
        .setFooter({ text: `頁數 ${page + 1} / ${totalPages}` });
    };

    // 生成按鈕
    const generateButtons = (page) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1),
        new ButtonBuilder()
          .setCustomId('refresh')
          .setLabel('🔄')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('skip')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('shuffle')
          .setLabel('🔀')
          .setStyle(ButtonStyle.Danger)
      );

    // 更新清單嵌入與按鈕
    const updateQueue = async (interaction) => {
      const currentQueue = distube.getQueue(message);

      if (!currentQueue || currentQueue.songs.length === 0) {
        // 如果清單為空，顯示清單已清空
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎵 播放清單已清空')
              .setDescription('目前沒有任何歌曲在播放。')
              .setColor('#FF0000'),
          ],
          components: [],
        });
        return;
      }

      const updatedPlayerEmbed = createPlayerEmbed(currentQueue.songs[0], currentQueue.currentTime);
      const updatedQueueEmbed = createQueueEmbed(currentPage);
      const updatedButtons = generateButtons(currentPage);

      await interaction.update({
        embeds: [updatedPlayerEmbed, updatedQueueEmbed],
        components: [updatedButtons]
      });
    };

    const playerEmbed = createPlayerEmbed(queue.songs[0], queue.currentTime);
    const queueEmbed = createQueueEmbed(currentPage);
    const buttons = generateButtons(currentPage);

    const messageEmbed = await message.channel.send({
      embeds: [playerEmbed, queueEmbed],
      components: [buttons]
    });

    const filter = (i) =>
      ['next', 'previous', 'refresh', 'skip', 'shuffle'].includes(i.customId);
    const collector = messageEmbed.createMessageComponentCollector({ filter });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: '你無法操作這些按鈕！', ephemeral: true });
        return;
      }

      try {
        switch (interaction.customId) {
          case 'next':
            currentPage++;
            break;
          case 'previous':
            currentPage--;
            break;
          case 'refresh':
            break; // 刷新邏輯（視需求）
          case 'skip':
            if (queue.songs.length > 1) {
              await distube.skip(queue);
            } else {
              await distube.stop(queue);
            }
            currentPage = 0; // 重置頁數
            break;
          case 'shuffle':
            await distube.shuffle(queue); // 打亂播放清單
            currentPage = 0; // 重置頁數
            break;
        }

        // 在 playSong 事件中處理嵌入更新
        updateQueue(interaction)
      } catch (error) {
        console.error(`操作 ${interaction.customId} 時發生錯誤:`, error);
        await interaction.reply({ content: '操作失敗，請稍後再試！', ephemeral: true });
      }
    });

    collector.on('end', async () => {
      const disabledButtons = generateButtons(currentPage).components.map((btn) =>
        btn.setDisabled(true)
      );
      await messageEmbed.edit({
        components: [new ActionRowBuilder().addComponents(disabledButtons)]
      });
    });
  }

});


// 當音樂播放完成時通知
distube.on('finish', async (queue) => {
  if (idleTimeout) clearTimeout(idleTimeout);

  // 設定新的計時器，在 30 秒後自動播放下一首歌
  idleTimeout = setTimeout(async () => {
    const currentQueue = distube.getQueue(queue.textChannel.guild.id);

    // 確保 `queue` 和 `voiceChannel` 仍然有效
    if (queue.voiceChannel && !currentQueue) {
      try {
        await distube.play(queue.voiceChannel, 'https://www.youtube.com/watch?v=NZoXV828Suo&pp=ygUN5aSa57Gz5aSa576FIA%3D%3D', {
          member: queue.voiceChannel.guild.members.me, // 確保取得機器人本身的 GuildMember
          textChannel: queue.textChannel,
        });
        console.log('隊列為空超過 30 秒，自動播放影片。');
      } catch (error) {
        console.error('自動播放影片時發生錯誤:', error);
      }
    }
  }, 60000); // 設定為 30 秒
});

const createProgressBar = (currentTime, duration, barLength = 20) => {
  const progress = Math.round((currentTime / duration) * barLength);
  const remaining = barLength - progress;
  return '█'.repeat(progress) + '░'.repeat(remaining);
};

const createPlayerEmbed = (song, currentTime = 0) => {
  const elapsedMinutes = Math.floor(currentTime / 60);
  const elapsedSeconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
  const elapsed = `${elapsedMinutes}:${elapsedSeconds}`;

  return new EmbedBuilder()
    .setColor('#7785CC') // Spotify 綠色
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

  const embed = createPlayerEmbed(currentSong, currentTime);

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
    // 如果有新音樂播放，清除計時器
    if (idleTimeout) {
      clearTimeout(idleTimeout);
      idleTimeout = null;
    }
    console.log(`[${new Date(Date.now()).toLocaleTimeString()}] 正在播放: ${song.name}`);
    // if (message) {
    //   await updateEmbedMsg(queue);
    // }
  })

  .on('addList', async (queue, playlist) => {
    const playTime = Date.now();
    console.log('抓完音樂:', new Date(playTime).toLocaleTimeString());

    if (!queue || queue.songs.length === 0) {
      await message.channel.send('目前沒有正在播放的音樂！');
      return;
    }

    const pageSize = 10; // 每頁顯示的歌曲數量
    let currentPage = 0;

    // 動態計算總頁數
    const calculateTotalPages = (songs) => Math.ceil(songs.length / pageSize);

    // 生成清單嵌入
    const createQueueEmbed = (page) => {
      const currentQueue = distube.getQueue(queue.textChannel.guild.id);
      const totalPages = calculateTotalPages(currentQueue.songs);
      const start = page * pageSize;
      const end = start + pageSize;
      const songs = currentQueue.songs.slice(1).slice(start, end); // 跳過正在播放的第一首

      return new EmbedBuilder()
        .setTitle('🎵 待播清單')
        .setDescription(
          songs.length > 0
            ? songs
              .map(
                (song, index) =>
                  `**${start + index + 1}**. [${song.name}](${song.url}) - \`${song.formattedDuration}\``
              )
              .join('\n')
            : '🎶 清單中沒有更多歌曲'
        )
        .setColor('#1DB954')
        .setFooter({ text: `頁數 ${page + 1} / ${totalPages}` });
    };

    // 生成按鈕
    const generateButtons = (page) => {
      const totalPages = calculateTotalPages(queue.songs);

      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1), // 多跳第一首歌
        new ButtonBuilder()
          .setCustomId('refresh')
          .setLabel('🔄')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('skip')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('shuffle')
          .setLabel('🔀')
          .setStyle(ButtonStyle.Danger)
      );
    };

    // 更新嵌入與按鈕
    const updateQueue = async (interaction) => {
      const currentQueue = distube.getQueue(queue.textChannel.guild.id);

      if (!currentQueue || currentQueue.songs.length === 0) {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎵 播放清單已清空')
              .setDescription('目前沒有任何歌曲在播放。')
              .setColor('#FF0000'),
          ],
          components: [],
        });
        return;
      }

      const updatedPlayerEmbed = createPlayerEmbed(currentQueue.songs[0], currentQueue.currentTime);
      const updatedQueueEmbed = createQueueEmbed(currentPage);
      const updatedButtons = generateButtons(currentPage);

      await interaction.update({
        embeds: [updatedPlayerEmbed, updatedQueueEmbed],
        components: [updatedButtons],
      });
    };

    // 初始化嵌入與按鈕
    const playerEmbed = createPlayerEmbed(queue.songs[0], queue.currentTime);
    const queueEmbed = createQueueEmbed(currentPage);
    const buttons = generateButtons(currentPage);

    const messageEmbed = await queue.textChannel.send({
      embeds: [playerEmbed, queueEmbed],
      components: [buttons],
    });

    // 按鈕交互處理邏輯
    const filter = (i) =>
      ['next', 'previous', 'refresh', 'skip', 'shuffle'].includes(i.customId);
    const collector = messageEmbed.createMessageComponentCollector({ filter });

    collector.on('collect', async (interaction) => {
      try {
        switch (interaction.customId) {
          case 'next':
            currentPage++;
            break;
          case 'previous':
            currentPage--;
            break;
          case 'refresh':
            break; // 刷新邏輯
          case 'skip':
            if (queue.songs.length > 1) {
              await distube.skip(queue);
            } else {
              await distube.stop(queue);
            }
            currentPage = 0; // 重置頁數
            break;
          case 'shuffle':
            await distube.shuffle(queue); // 打亂播放清單
            currentPage = 0; // 重置頁數
            break;
        }

        await updateQueue(interaction); // 更新嵌入與按鈕
      } catch (error) {
        console.error(`操作 ${interaction.customId} 時發生錯誤:`, error);
        await interaction.reply({ content: '操作失敗，請稍後再試！', ephemeral: true });
      }
    });

    collector.on('end', async () => {
      const disabledButtons = generateButtons(currentPage).components.map((btn) =>
        btn.setDisabled(true)
      );
      await messageEmbed.edit({
        components: [new ActionRowBuilder().addComponents(disabledButtons)],
      });
    });
  })

  .on('error', (queue, error) => {
    console.error(`播放清單或歌曲時發生錯誤: ${error.message}`);
    // queue.textChannel?.send(`播放清單中的某首歌曲發生錯誤: ${error.message}`);

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
