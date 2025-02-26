require("dotenv").config();

const envToken = process.env.token;
const envGuildIds = process.env.guildIds;

const envCooldownDuration = parseInt(process.env.cooldownDuration);

const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({ "intents": [
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
] });

client.zBotGData = require("./zBotGData");
client.zBotSlashCommands = require("./zBotSlashCommands");
client.cooldowns = {};

const { generateDependencyReport } = require('@discordjs/voice');

client.once(Events.ClientReady, (cl) => {
    for(const splited of envGuildIds.split(";")){
        const guildId = splited.trim();
        
        if(guildId === "") continue;
        
        cl.application.commands.set(cl.zBotSlashCommands, guildId);
    }

    console.log(generateDependencyReport());
	console.log(`Ready! (${cl.user.tag})`);

    return;
});

client.on(Events.InteractionCreate, async(interaction) => {
    const { zBotGData, zBotSlashCommands, cooldowns } = interaction.client;

    const command = zBotSlashCommands.find(
        (x) => { return x.name === interaction.commandName; }
    );

    if(!command){
        interaction.reply("コマンドに紐付けされた処理がありません")
            .catch((error) => { console.error(error); });

        return;
    }

    if(interaction.isChatInputCommand()){
        const now = Date.now();
        const userId = interaction.user.id;
        
        if(cooldowns[userId] !== void 0){
            const expirationTime = cooldowns[userId] + envCooldownDuration;
    
            if(now < expirationTime){
                interaction.reply({ "content": "コマンドは間隔を空けて実行してください", "ephemeral": true })
                    .catch((error) => { console.error(error); });
    
                return;
            }
        } 
    
        cooldowns[userId] = now;
        setTimeout(() => delete cooldowns[userId], envCooldownDuration);

        command.excute(interaction, zBotGData)
            .catch((error) => { console.error(error); });

        return;
    }

    if(interaction.isAutocomplete()){
        command.autocomplete(interaction, zBotGData)
            .catch((error) => { console.error(error); });

        return;
    }

    return;
});

const zBotMessageHandler = require("./zBotMessageHandler");

client.on(Events.MessageCreate, async(message) => {
    const { zBotGData } = message.client;
    
    //const zBotMessageHandler = require("./zBotMessageHandler");
    zBotMessageHandler(message, zBotGData)
        .catch((error) => { console.error(error); });

    return;
});

const zBotReactionHandler = require("./zBotReactionHandler");

client.on(Events.MessageReactionAdd, async(reaction, user) => {
    const { zBotGData } = reaction.client;
    
    //const zBotReactionHandler = require("./zBotReactionHandler");
    zBotReactionHandler(reaction, user, zBotGData)
        .catch((error) => { console.error(error); });

    return;
});

client.login(envToken); 