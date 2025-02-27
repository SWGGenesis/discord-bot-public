const Discord = require('discord.js');
const SWG = require('./swgclient');
const config = require('./config');
SWG.login(config.SWG);

var client, server, notif, chat, notifRole;

function discordBot() {
    client = new Discord.Client(); // No intents needed in v11

    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);

        server = client.guilds.find("name", config.Discord.ServerName);
        if (!server) {
            console.log("Server not found. Check the server name in config.");
            return;
        }

        notif = server.channels.find("name", config.Discord.NotificationChannel);
        chat = server.channels.find("name", config.Discord.ChatChannel);
        notifRole = server.roles.find("name", config.Discord.NotificationMentionRole);

        console.log(`Bot is ready in server: ${server.name}`);
        client.user.setGame("Progor-Chat"); // Setting bot presence (v11 syntax)
    });

    client.on('message', async (message) => {
        console.log(`[DEBUG] Received message from ${message.author.tag} in ${message.channel.name}: ${message.content}`);
        if (message.author.bot) return; // Ignore bot messages

        if (message.content.startsWith('!server')) {
            message.reply(SWG.isConnected ? "The server is UP!" : "The server is DOWN :(");
        }

        if (message.content.startsWith('!fixchat')) {
            message.reply("Rebooting chat bot...");
            process.exit(0);
        }

        if (message.content.startsWith('!pausechat')) {
            message.reply(SWG.paused ? "Unpausing" : "Pausing");
            SWG.paused = !SWG.paused;
        }

        if (!server || !chat) {
            console.log("[DEBUG] Server or chat channel is undefined.");
            return;
        }

        if (message.channel.name === config.Discord.NotificationChannel) {
            console.log(`[DEBUG] Forwarding message from ${message.author.tag} to ${config.Discord.ChatChannel}`);
            chat.send(`**${message.author.username}:** ${message.content}`);
        }

        if (message.channel.name !== config.Discord.ChatChannel) {
            console.log(`[DEBUG] Ignoring message from ${message.channel.name}`);
            return;
        }

        const memberName = message.member ? message.member.displayName : message.author.username;
        console.log(`[DEBUG] Sending to SWG: ${message.cleanContent} from ${memberName}`);
        SWG.sendChat(message.cleanContent, memberName);
    });

    client.on('disconnect', (event) => {
        console.log("Bot disconnected:", JSON.stringify(event, null, 2));
        client = server = notif = chat = notifRole = null;
        setTimeout(discordBot, 1000);
    });

    client.login(config.Discord.BotToken)
        .catch(error => {
            console.error("Login failed:", error);
            setTimeout(discordBot, 1000);
        });
}

discordBot();

SWG.serverDown = function() {
    if (notif) notif.send(`${notifRole} server DOWN`);
}

SWG.serverUp = function() {
    if (notif) notif.send(`${notifRole} server UP!`);
}

SWG.reconnected = function() {
    if (chat) chat.send("Chat bot reconnected.");
}

SWG.recvChat = function(message, player) {
    console.log(`[DEBUG] Sending chat to Discord: ${player}: ${message}`);
    if (chat) chat.send(`**${player}:**  ${message}`);
}

SWG.recvTell = function(from, message) {
    console.log(`[DEBUG] Received tell from: ${from}: ${message}`);
    if (from !== config.SWG.Character) SWG.sendTell(from, "Hi!");
}

setInterval(() => SWG.sendTell(config.SWG.Character, "ping"), 30000);
