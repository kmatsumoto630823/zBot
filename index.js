require("dotenv").config();

// 必須環境変数のリスト
const requiredEnvVars = [
    "token",
    "guildIds",
    "cooldownDuration",
];

// 環境変数の存在チェック
require("./utils/chkEnvVars")(requiredEnvVars);

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

zBotGData = require("./zBotGData");
zBotSlashCommands = require("./zBotSlashCommands");
cooldowns = new Map();

const { generateDependencyReport } = require('@discordjs/voice');

client.once(Events.ClientReady, (cl) => {
    // コマンドを登録する
    for(const splited of envGuildIds.split(";")){
        const guildId = splited.trim();
        cl.application.commands.set(cl.zBotSlashCommands, guildId);
    }

    console.log(generateDependencyReport());
	console.log(`Ready! (${cl.user.tag})`);

    return;
});

client.on(Events.InteractionCreate, async(interaction) => {
    // zBotSlashCommandsを取得
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
        
        //クールダウンを管理する
        if(cooldowns.has(userId)){
            const expirationTime = cooldowns.get(userId);
    
            if(now < expirationTime){
                interaction.reply({ "content": "コマンドは間隔を空けて実行してください", "ephemeral": true })
                    .catch((error) => { console.error(error); });
    
                return;
            } else {
                cooldowns.delete(userId); //有効期限切れのユーザーIDを削除
            }
        } 
    
        cooldowns.set(userId, now + envCooldownDuration);
        setTimeout(() => cooldowns.delete(userId), envCooldownDuration);

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
    zBotMessageHandler(message, zBotGData)
        .catch((error) => { console.error(error); });

    return;
});

const zBotReactionHandler = require("./zBotReactionHandler");

client.on(Events.MessageReactionAdd, async(reaction, user) => {
    zBotReactionHandler(reaction, user, zBotGData)
        .catch((error) => { console.error(error); });

    return;
});

client.login(envToken);
