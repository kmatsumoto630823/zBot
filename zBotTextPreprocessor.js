const twEmojiDict = require("./utils/twEmojiDict");
const emojiRegex = require("./utils/emojiRegex");

const compiledEmojiRegex = emojiRegex();
const compiledEmojiRegexWithSpace = new RegExp(`(${compiledEmojiRegex.source}) ?`, "gu");

/**
 * テキストを読み上げ用に前処理する
 * @param {string} text - 処理するテキスト
 * @param {object} dict - ユーザー辞書
 * @returns {string[]} - 分割されたテキストの配列
 */
function zBotTextPreprocessor(text, dict){
    // URL の削除
    text = text.replace(/[a-zA-Z]*:\/\/\S*/g, "");

    // カスタム絵文字の正規化(絵文字を<::id>に置換、直後のスペースを削除)
    text = text.replace(/<a?:\w+:(\d+)> ?/g, "<::$1>");

    // 標準絵文字の正規化(絵文字の直後のスペースを削除)
    text = text.replace(compiledEmojiRegexWithSpace, "$1");

    // メンション等の削除
    text = text.replace(/(<a?:\w+:\d+>|<@!?(\d+)>|<@&\d+>|<#\d+>|<t:\d+(?::[tTdDfFR])?>|<\/\w+:\d+>)/g, "");

    // ユーザー辞書による置換
    text = replaceByLongestMatch(text, dict);

    // twEmoji 辞書による置換
    text = replaceByLongestMatch(text, twEmojiDict);

    // カスタム絵文字の削除
    text = text.replace(/<::\d+>/g, "");

    // 標準絵文字の削除
    text = text.replace(compiledEmojiRegex, "");
    
    // 改行を文の区切り(\0)に置換
    text = text.replace(/\r?\n/g, "\0");

    // 文末処理(文末に\0\0を挿入)
    text = text.replace(/[!\?！？。)]+/g, x => x + "\0\0");

    // 連続していない区切り(\0)を読点（、）に置換
    text = text.replace(/(?<!\0)\0(?!\0)/g, "、");

    // テキストの分割と空文字の削除
    const splitedText = text.split("\0").filter(x => x !== "");

    return splitedText;
};

/**
 * 辞書に基づき、最長一致でテキストを置換する
 * @param {string} text - 置換対象のテキスト
 * @param {object} dict - 置換辞書
 * @returns {string} - 置換後のテキスト
 */
function replaceByLongestMatch(text, dict){
    const sortedWordsByLength = Object.keys(dict).toSorted((a, b) => b.length - a.length);

    for(const word of sortedWordsByLength){
        const reading = dict[word];
        text = text.replaceAll(word, reading);
    }

    return text;
};

module.exports = zBotTextPreprocessor;
