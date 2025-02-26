const twEmojiDict = require("./utils/twEmojiDict");
const emojiRegex = require("./utils/emojiRegex");

const customEmojiRegexWithSpace = /<:[a-zA-Z0-9_]+:([0-9]+)>( )?/g;
const emojiRegexWithSpace = new RegExp(`(${emojiRegex().source})( )?`, "gu");

function zBotTextPreprocessor(text, dictionary){
    text = text
        .replace(/[a-zA-Z]*:\/\/\S*/g, "")
        .replace(/<(@!?|#|@&)[a-zA-Z0-9]+>/g, "")
        .replace(customEmojiRegexWithSpace, "<::$1>")
        .replace(emojiRegexWithSpace, "$1")
    ;

    text = replaceByLongestMatch(text, dictionary);
    text = replaceByLongestMatch(text, twEmojiDict);

    text = text
        .replace(/<::[0-9]+>/g, "")
        .replace(emojiRegex(), "")
    ;
    
    text = text
        .replace(/\r?\n/g, "\0")
        .replace(/[!\?！？。)]+/g, (x) => { return x + "\0\0"; })
        .replace(/(?<!\0)\0(?!\0)/g, "、")
        .replace(/\0{2,}/g, "\0")
    ;

    const splitedText = [];
    
    for(const splited of text.split("\0")){
        if(splited === "") continue;
        
        splitedText.push(splited);
    }

    return splitedText;
};

function replaceByLongestMatch(text, dictionary){
    const words = Object.keys(dictionary).toSorted((a, b) => { return b.length - a.length; });

    for(const word of words){
        const reading = dictionary[word];
        text = text.replaceAll(word, reading);
    }

    return text;
};

module.exports = zBotTextPreprocessor;