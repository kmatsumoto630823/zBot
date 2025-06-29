require("dotenv").config();

// 環境変数の存在チェック
require("./utils/chkEnvVars")([
    "voiceServers",
    "voiceServerTextLengthLimit",
    "samplingRate",
    "queueTimeout",
    "queuePollingInterval",
]);

const envVoiceServers = process.env.voiceServers;
const envVoiceServerTextLengthLimit = parseInt(process.env.voiceServerTextLengthLimit);

const envSamplingRate = parseInt(process.env.samplingRate);
const envQueueTimeout = parseInt(process.env.queueTimeout);
const envQueuePollingInterval = parseInt(process.env.queuePollingInterval);

const { setTimeout } = require("timers/promises");
const { entersState, AudioPlayerStatus } = require("@discordjs/voice");

/**
 * 音声合成してDiscordで再生する
 * @param {string[]} splitedText - 分割されたテキスト
 * @param {object} speaker - 話者オブジェクト
 * @param {object} player - オーディオプレーヤー
 * @param {object} queue - キュー
 */
async function zBotTextToSpeech(splitedText, speaker, player, queue){
    const fullTextLength = splitedText.reduce((sum, text) => sum + text.length, 0);

    // 文字数制限を超えた場合の処理
    if(fullTextLength > envVoiceServerTextLengthLimit){
        splitedText = ["文字数が上限を超えています"];
    }

    const ticket = Symbol(); // キュー管理用の一意の識別子
    enQueue(queue, ticket);

    let count = Math.floor(envQueueTimeout / envQueuePollingInterval);

    // タイムアウトまで待機（自分の順番になるまで）
    while(queue[0] !== ticket){
        if(count === 0){
            deQueue(queue, ticket);
            return;
        }

        await setTimeout(envQueuePollingInterval);
        
        if(!queue.includes(ticket)) return; // キューから削除されていた場合は終了
        count--;
    }

    const waveDatas = [];

    for(const text of splitedText){
        const waveData = await voiceSynthesis(text, speaker);
        if(!waveData) continue;
        waveDatas.push(waveData);
    }

    for(const waveData of waveDatas){
        await entersState(player, AudioPlayerStatus.Idle, envQueueTimeout); // 前の音声再生が終わるまで待つ
        if(!queue.includes(ticket)) return;  // キューから削除された場合は終了
        player.play(waveData);
    }

    deQueue(queue, ticket);
    return;
}

const { createAudioResource, StreamType } = require("@discordjs/voice");

/**
 * 音声を合成する
 * @param {string} text - 合成するテキスト
 * @param {object} speaker - 話者オブジェクト
 * @returns {object} - 音声データ
 */
async function voiceSynthesis(text, speaker){
    const servers = getVoiceServers();
    const server = servers.find( (x) => { return x.engine === speaker.engine; });

    if(!server){
        throw new Error(`Failed to retrieve voice server information for engine '${speaker.engine}'. Please check the configuration format.`);
     }

    // 音声合成のクエリ作成
    const response_audio_query = await fetch(server.baseURL + "/audio_query?text=" + encodeURIComponent(text) + "&speaker=" + speaker.id, {
        "method": "POST",
        "headers":{ "accept": "application/json" }
    });

    if(!response_audio_query.ok){
        throw new Error(`audio_query API failed: ${response_audio_query.status} ${response_audio_query.statusText}`);
    }

    const audioQuery = await response_audio_query.json();

    // どちらも設定されている場合は、音声合成クエリに適用
    if(audioQuery.speedScale         !== void 0) audioQuery.speedScale         = speaker.speedScale;
    if(audioQuery.pitchScale         !== void 0) audioQuery.pitchScale         = speaker.pitchScale;
    if(audioQuery.intonationScale    !== void 0) audioQuery.intonationScale    = speaker.intonationScale;
    if(audioQuery.volumeScale        !== void 0) audioQuery.volumeScale        = speaker.volumeScale;
    if(audioQuery.tempoDynamicsScale !== void 0) audioQuery.tempoDynamicsScale = speaker.tempoDynamicsScale;

    audioQuery.outputSamplingRate = envSamplingRate;

    // 音声データの生成
    const response_synthesis = await fetch(server.baseURL + "/synthesis?speaker=" + speaker.id, {
        "method": "POST",
        "headers": { "accept": "audio/wav", "Content-Type": "application/json" },
        "body": JSON.stringify(audioQuery)
    });

    if(!response_synthesis.ok){
        throw new Error(`synthesis API failed: ${response_synthesis.status} ${response_synthesis.statusText}`);
    }

    // ストリームとして音声データを扱う
    const stream = response_synthesis.body;
    const waveData = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    
    return waveData;
}

/**
 * キューに登録する
 * @param {object[]} queue - キュー
 * @param {symbol} ticket - チケット
 */
function enQueue(queue, ticket){
    if(!queue || !ticket) return;
    queue.push(ticket);
    return;
}

/**
 * キューから削除する（自分より前のチケットも含めて一掃）
 * @param {object[]} queue - キュー
 * @param {symbol} ticket - チケット
 */
function deQueue(queue, ticket){
    if(!queue || !ticket) return;
    if(!queue.includes(ticket)) return; // チケットが含まれていない場合、処理をしない。

    const index = queue.indexOf(ticket);
    queue.splice(0, index + 1);// 自分より前のチケットも削除
    
    return;
}

/**
 * 音声サーバーを取得する
 * @returns {object[]} - サーバー情報の配列
 */
function getVoiceServers(){
    const servers = [];

    for(const splited of envVoiceServers.split(";")){
        const url = new URL(splited.trim());

        // URLフラグメントをエンジン識別子として扱う(#の部分は取り除く)
        const engine  = url.hash.replace(/^#/, ""); 
        const baseURL = url.origin;

        if(!engine) continue; // エンジン識別子がない場合は無効とする

        servers.push({ "engine": engine, "baseURL": baseURL });
    }

    return servers;
}

module.exports = zBotTextToSpeech;
