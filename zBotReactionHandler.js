const { getVoiceConnection } = require("@discordjs/voice");
const zBotTextPreprocessor = require("./zBotTextPreprocessor");
const zBotTextToSpeech = require("./zBotTextToSpeech");

/**
 * メッセージにリアクションが追加された際のハンドラー
 * @param {object} reaction - Discord のリアクションオブジェクト
 * @param {object} user - Discord のユーザーオブジェクト
 * @param {object} zBotGData - zBot のグローバルデータオブジェクト
 */
async function zBotReactionHandler(reaction, user, zBotGData){
    if(user.bot) return;
    
    if(reaction.count !== 1) return;

    const guildId = reaction.message.guildId;

    if(!guildId) return;

    const connection = getVoiceConnection(guildId);

    if(!connection) return;

    const guildConfig = zBotGData.initGuildConfigIfUndefined(guildId);

    if(!guildConfig.isReactionSpeach) return;

    const onEventTextChannelId = reaction.message.channel.id;
    const targetTextChannelId = guildConfig.textChannelId;

    if(onEventTextChannelId !== targetTextChannelId) return;

    const memberId = user.id;
    const memberSpeakerConfig = zBotGData.initMemberSpeakerConfigIfUndefined(guildId, memberId);

    const text = (reaction.emoji.id === null) ? reaction.emoji.name : "<::" + reaction.emoji.id + ">";
    const dict = zBotGData.initGuildDictionaryIfUndefined(guildId);

    const splitedText = zBotTextPreprocessor(text, dict);
    
    const speaker = memberSpeakerConfig;
    const player = connection.state.subscription.player;
    const queue = zBotGData.initGuildQueueIfUndefined(guildId);

    await zBotTextToSpeech(splitedText, speaker, player, queue);

    return;
};

module.exports = zBotReactionHandler;
