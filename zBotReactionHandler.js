const { getVoiceConnection } = require("@discordjs/voice");
const zBotTextPreprocessor = require("./zBotTextPreprocessor");
const zBotTextToSpeech = require("./zBotTextToSpeech");

async function zBotReactionHandler(reaction, user, zBotGData){
    if(user.bot) return;
    
    if(reaction.count !== 1) return;

    const guildId = reaction.message.guildId;

    //const { getVoiceConnection } = require("@discordjs/voice");
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
    const dictionary = zBotGData.initGuildDictionaryIfUndefined(guildId);

    //const zBotTextPreprocessor = require("./zBotTextPreprocessor");
    const splitedText = zBotTextPreprocessor(text, dictionary);
    
    const speaker = memberSpeakerConfig;
    const player = connection.state.subscription.player;
    const queue = zBotGData.initGuildQueueIfUndefined(guildId);

    //const zBotTextToSpeech = require("./zBotTextToSpeech");
    await zBotTextToSpeech(splitedText, speaker, player, queue);

    return;
};

module.exports = zBotReactionHandler;