// deploy-commands.js
const { REST, Routes } = require('discord.js');
require('dotenv').config(); // 加載 .env 文件中的變數

const { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  {
    name: 'play',
    description: 'Play a song by URL or name',
    options: [
      {
        name: 'query',
        type: 3, // 3 代表 string
        description: 'The song URL or name to play',
        required: true,
      },
    ],
  },
  {
    name: 'skip',
    description: 'Skip the current song',
  },
  {
    name: 'queue',
    description: 'View the current song queue',
  },
  {
    name: 'pause',
    description: 'Pause the current song',
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // 全局註冊斜線指令
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();