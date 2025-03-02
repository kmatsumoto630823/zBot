const { getVoiceConnection } = require("@discordjs/voice");
const zBotTextPreprocessor = require("./zBotTextPreprocessor");
const zBotTextToSpeech = require("./zBotTextToSpeech");

/**
 * メッセージが作成された際のハンドラー
 * @param {object} message - Discord のメッセージオブジェクト
 * @param {object} zBotGData - zBot のグローバルデータオブジェクト
 */
async function zBotMessageHandler(message, zBotGData){
    if(message.author.bot) return;

    const guildId = message.guildId;

    if(!guildId) return;

    const connection = getVoiceConnection(guildId);

    if(!connection) return;

    const guildConfig = zBotGData.initGuildConfigIfUndefined(guildId);

    if(new RegExp(guildConfig.excludeRegEx).test(message.content)) return;

    const onEventTextChannelId = message.channel.id;
    const targetTextChannelId = guildConfig.textChannelId;

    if(onEventTextChannelId !== targetTextChannelId) return;

    const memberId = message.member.id;
    const memberSpeakerConfig = zBotGData.initMemberSpeakerConfigIfUndefined(guildId, memberId);

    const text = message.content;
    const dict = zBotGData.initGuildDictionaryIfUndefined(guildId);

    const splitedText = zBotTextPreprocessor(text, dict);
    
    const speaker = memberSpeakerConfig;
    const player = connection.state.subscription.player;
    const queue = zBotGData.initGuildQueueIfUndefined(guildId);

    await zBotTextToSpeech(splitedText, speaker, player, queue);

    return;
};

module.exports = zBotMessageHandler;
