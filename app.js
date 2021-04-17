require('dotenv').config();
const fs = require('fs');
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const Discord = require('discord.js');
const bot = new Discord.Client({
  disableMentions: 'everyone'
});
const config = require('./config.json');
const mineflayer = require('mineflayer');


// Startup of Discord bot
bot.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  bot.commands.set(command.name, command);
}

const listeningTo = [
  "Horus Goes Shopping on Spotify",
  "Hypixel Knights Talent Show Album on repeat",
  "Hypixel Knights Talent Show Album",
  "What Makes You Beautiful Cover on Soundcloud",
  "Demons (Imagine Dragons Cover) on Soundcloud",
  "hitches and iro dying of laughter on Soundcloud",
  "505 (Arctic Monkeys Cover) on Soundcloud",
  "Isabella's Lullaby on Soundcloud",
  "Hotel Yorba (White Stripes Cover) on Soundcloud",
  "Mine Diamonds (MCAP Cover) on Soundcloud",
  "I Miss The Old Meanie on Soundcloud",
  "Payphone (Maroon 5 Cover) on Soundcloud"
];

bot.on('ready', () => {
  console.log('Success! Discord bot is now online.');
  bot.user.setStatus('online');
  setInterval(() => {
    const statusIndex = Math.floor(Math.random() * (listeningTo.length - 1) + 1);
    bot.user.setActivity(listeningTo[statusIndex], {
      type: 'LISTENING'
    });
  }, 60000);
});

bot.on('guildCreate', guild => {
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});

bot.on('guildDelete', guild => {
  console.log(`Bot removed from: ${guild.name} (id: ${guild.id})`);
});

// Startup of Minecraft bot
function spawnBot() {
  const minebot = mineflayer.createBot({
    host: 'mc.hypixel.net',
    username: process.env.MC_USER,
    password: process.env.MC_PASS,
    version: '1.16.4',
    auth: 'microsoft',
    checkTimeoutInterval: 30000,
    interval: 5000
  });

  // Send to Limbo on login (source: https://github.com/mew/discord-hypixel-bridge)
  minebot.on('login', async () => {
    setTimeout(() => {
      console.log('Logged in.');
      minebot.chat('/ac \u00a7c<3');
    }, 5000);
    console.log('Successfully joined Hypixel.');
  });

  // Display chat in console and send to Limbo again if kicked or something (source: https://github.com/mew/discord-hypixel-bridge)
  minebot.on('message', (chatMsg) => {
    console.log(chatMsg.toAnsi());
    const msg = chatMsg.toString();
    if (msg.endsWith(' joined the lobby!') && msg.includes('[MVP+')) {
      console.log('Lobby detected: Sending to Limbo.');
      minebot.chat('/ac \u00a7ca');
    }
  });

  // Console to in-game
  rl.on('line', (input) => {
    minebot.chat(input);
  });

  // Bot reconnection message
  setTimeout(() => {
    minebot.chat('/g online');
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`<:yes:829640052531134464> Bot has reconnected.`);
  }, 7000);

  // Mineflayer chat patterns

  // Guild chat pattern (source: https://github.com/Myzumi/Guild-Bot)
  minebot.chatAddPattern(
    /^Guild > (\[.*?\])*.*? ([\w\d]{2,17}).*?( \[.*?\])*.*?: (\w*.*.{1,10000})*$/i, 'guildChat', 'Guild chat event'
  );

  // On guild member join/leave Hypixel
  minebot.chatAddPattern(
    /^Guild > ([\w\d]{2,17}).*? (\w*[A-z0-9_ \.\,;:\-_\/]{1,10000})*$/i, 'memberJoinLeave', 'Join leave event'
  );

  // Get online guild members
  minebot.chatAddPattern(
    /^Online Members: (.+)$/i, 'getNumOfOnline', 'Number of online members'
  );

  // On new guild member
  minebot.chatAddPattern(
    /^(\[.*?\])*.*? ([\w\d]{2,17}).*? joined the guild!$/i, 'newGuildMember', 'New guild member joins'
  );

  // On member leave guild
  minebot.chatAddPattern(
    /^(\[.*?\])*.*? ([\w\d]{2,17}).*? left the guild!$/i, 'byeGuildMember', 'Member leaves the guild'
  );

  // On member kicked
  minebot.chatAddPattern(
    /^(\[.*?\])*.*? ([\w\d]{2,17}).*? was kicked by (\[.*?\])*.*? ([\w\d]{2,17}).*?!$/i, 'kickedGuildMember', 'Member gets the boot'
  );

  // Bot reconnection log to Discord (source: https://github.com/Myzumi/Guild-Bot)
  minebot.on('getNumOfOnline', (numOfOnline) => {
    let numOfTrueOnline = numOfOnline - 1;
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`:information_source: There are **${numOfTrueOnline}** other members online.`);
  });

  // In-game to Discord
  minebot.on('guildChat', (rank, playername, grank, message) => {
    if (playername === minebot.username) return;
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`<a:MC:829592987616804867> **${rank} ${playername}: ${message}**`);
  });

  // Discord to in-game
  bot.on('message', message => {
    if (message.author.id === bot.user.id) return;
    // Source: https://github.com/mew/discord-hypixel-bridge
    if (message.channel.id !== config.gchatID || message.author.bot || message.content.startsWith(config.prefix)) return;
    minebot.chat(`/gc ${message.author.username} > ${message.content}`);
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`<:discord:829596398822883368> **${message.author.username}: ${message.content}**`);
    message.delete().catch(error => {
      if (error.code == 10008) {
        console.log(error);
        message.channel.send(`**:warning: ${message.author}, there was an error while performing that task.**`);
      }
      if (error.code == 50001) {
        console.log(error);
        message.channel.send(`**:warning: ${message.author}, I need MANAGE_MESSAGES to perform that task.**`);
      }
    });
  });

  // Member join/leave server, join/leave guild, kicked from guild

  minebot.on('memberJoinLeave', (playername, joinleave) => {
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`<:hypixel:829640659542867969> **${playername} ${joinleave}**`);
  });

  minebot.on('newGuildMember', (rank, playername) => {
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`<a:join:830746278680985620> ${rank} ${playername} joined the guild!`);
  });

  minebot.on('byeGuildMember', (rank, playername) => {
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`<a:leave:830746292186775592> ${rank} ${playername} left the guild.`);
  });

  minebot.on('kickedGuildMember', (rank1, playername1, rank2, playername2) => {
    bot.guilds.cache.get(config.HKID).channels.cache.get(config.gchatID).send(`<a:leave:830746292186775592> ${rank1} ${playername1} was kicked by ${rank2} ${playername2}!`);
  });

  // Minebot error logging
  minebot.on('error', (error) => {
    console.log("Error event fired.");
    console.log(error);
    bot.guilds.cache.get(config.errorLogGuildID).channels.cache.get(config.errorLogChannelID).send(`**Minebot: Error** \`\`\`${error}\`\`\``);
    console.log("Restarting in 10 seconds.");
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  });

  minebot.on('end', (error) => {
    console.log("End event fired.");
    console.log(error);
    bot.guilds.cache.get(config.errorLogGuildID).channels.cache.get(config.errorLogChannelID).send(`**Minebot: Ended** \`\`\`${error}\`\`\``);
    console.log("Restarting in 10 seconds.");
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  });

  minebot.on('kicked', (reason) => {
    console.log("The bot was kicked.")
    console.log(reason);
    bot.guilds.cache.get(config.errorLogGuildID).channels.cache.get(config.errorLogChannelID).send(`**The bot was kicked. Reason:** \`\`\`${reason}\`\`\``);
    console.log("Restarting in 10 seconds.");
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  });
}

setTimeout(() => {
  spawnBot();
}, 5000);

// Discord bot stuff
bot.on('message', async message => {
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  if (message.author.bot) return;
  if (!message.content.startsWith(config.prefix)) return;
  if (message.content.includes(process.env.BOT_TOKEN)) {
    message.replace(bot.token, 'undefined');
  }

  if (!bot.commands.has(command)) return;
  try {
    bot.commands.get(command).execute(message, args);
  } catch (error) {
    console.error(error);
    message.react(`<:nah:829640042334257202>`);
    message.reply('there was an error trying to execute that command! Check the console log for more details.');
    bot.guilds.cache.get(config.errorLogGuildID).channels.cache.get(config.errorLogChannelID).send(`**General command error:** \`\`\`${error}\`\`\``);
  }
});

bot.login(process.env.BOT_TOKEN);