require('dotenv').config(); // 加載 .env 文件中的變數

const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp'); 
const ffmpeg = require('@ffmpeg-installer/ffmpeg'); // 引用 ffmpeg 模組
// const { generateDependencyReport } = require('@discordjs/voice');
// console.log(generateDependencyReport());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// 初始化 DisTube
const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin()],
  ffmpeg: {
    path: 'D:\\Users\\Mouse\\Desktop\\code\\nodejs\\discord-good-music-day-bot\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe'
  }
});

client.once('ready', () => {
  console.log(`${client.user.tag} 已上線！`);
});

// 音樂播放指令
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.split(' ');
  const command = args.shift();

  if (command === '!play') {
    const url = args.join(' ');
    console.log(url);
    if (!url) {
      message.reply('請提供要播放的音樂連結。');
      return;
    }
    if (message.member.voice.channel) {
      distube.play(message.member.voice.channel, url, {
        member: message.member,
        textChannel: message.channel,
        message
      });
    } else {
      message.reply('你需要先加入語音頻道！');
    }
  } else if (command === '!skip') {
    const queue = distube.getQueue(message);
    if (!queue) {
      // message.reply('目前沒有正在播放的音樂！');
      return;
    }
    distube.skip(message); // 跳過當前歌曲
    // message.reply('已跳過當前歌曲！');
  }
});

// 當音樂播放完成時通知
distube.on('finish', (queue) => {
  queue.textChannel.send('播放結束！');
});

distube
  .on('playSong', (queue, song) => {
    // queue.setVolume(100);
    // client.user.setActivity(`🎶 正在播放: ${song.name}`, { type: 'LISTENING' });
    console.log(`正在播放: ${song.name}`);
    // console.log(client.user.presence.activities)
  })
  .on('error', (channel, error) => {
    console.error(`播放時發生錯誤: ${error}`);
  });

// 登入機器人
client.login(process.env.DISCORD_BOT_TOKEN);
