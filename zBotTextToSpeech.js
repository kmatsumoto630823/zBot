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
const { Readable } = require("stream");
const { createAudioResource, StreamType, entersState, AudioPlayerStatus } = require("@discordjs/voice");


/**
 * 音声合成してDiscordで再生する
 * @param {string[]} splitText - 分割されたテキスト
 * @param {object} speaker - 話者オブジェクト
 * @param {object} player - オーディオプレーヤー
 */
async function zBotTextToSpeech(splitText, speaker, player){
    const fullTextLength = splitText.reduce((sum, text) => sum + text.length, 0);

    // 文字数制限を超えた場合の処理
    if(fullTextLength > envVoiceServerTextLengthLimit){
        splitText = ["文字数が上限を超えているのだ"];
    }

    const queue = getQueue(player);

    const ticket = Symbol(); // キュー管理用の一意の識別子
    enQueue(queue, ticket);

    try {
        let count = Math.floor(envQueueTimeout / envQueuePollingInterval);

        // タイムアウトまで待機（自分の順番になるまで）
        while(true){
            if(count === 0) return;
            if(!queue.includes(ticket)) return; // キューから削除されていた場合は終了
            
            if(queue[0] === ticket) break;

            await setTimeout(envQueuePollingInterval);
            count--;
        }

        const wavBuffers = [];

        for(const text of splitText){
            const buffer = await voiceSynthesis(text, speaker);
            if(!queue.includes(ticket)) return;  // キューから削除された場合は終了

            if(!buffer) continue;
            
            wavBuffers.push(buffer);
        }

        const mergedWavBuffer = concatWavBuffers(wavBuffers);

        if(wavBuffers.length === 0) return;

        const audioResource = createAudioResource(Readable.from(mergedWavBuffer), { 
            inputType: StreamType.Arbitrary
        });

        await entersState(player, AudioPlayerStatus.Idle, envQueueTimeout);
        if(!queue.includes(ticket)) return;

        player.play(audioResource);        


    } catch(error) {
        throw error;
    } finally {
        deQueue(queue, ticket);
    }

    return;
}

/**
 * 音声を合成する
 * @param {string} text - 合成するテキスト
 * @param {object} speaker - 話者オブジェクト
 * @returns {Buffer} - 音声データ
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

    // プロパティがある場合のみ上書きする
    if(audioQuery.speedScale         !== void 0) audioQuery.speedScale         = speaker.speedScale;
    if(audioQuery.pitchScale         !== void 0) audioQuery.pitchScale         = speaker.pitchScale;
    if(audioQuery.intonationScale    !== void 0) audioQuery.intonationScale    = speaker.intonationScale;
    if(audioQuery.volumeScale        !== void 0) audioQuery.volumeScale        = speaker.volumeScale;
    if(audioQuery.tempoDynamicsScale !== void 0) audioQuery.tempoDynamicsScale = speaker.tempoDynamicsScale;
    

    if(audioQuery.outputSamplingRate !== void 0) audioQuery.outputSamplingRate = envSamplingRate;

    // 音声データの生成
    const response_synthesis = await fetch(server.baseURL + "/synthesis?speaker=" + speaker.id, {
        "method": "POST",
        "headers": { "accept": "audio/wav", "Content-Type": "application/json" },
        "body": JSON.stringify(audioQuery)
    });

    if(!response_synthesis.ok){
        throw new Error(`synthesis API failed: ${response_synthesis.status} ${response_synthesis.statusText}`);
    }

    const arrayBuffer = await response_synthesis.arrayBuffer();
    return Buffer.from(arrayBuffer);
}


/**
 * 複数のWAVバッファをメモリ上で1つに結合する（厳密なチェックは行わない）
 * @param {Buffer[]} buffers - WAVデータの配列
 * @returns {Buffer|null} - 結合されたWAVデータ
 */
function concatWavBuffers(buffers) {
    if(!buffers || buffers.length === 0) return null;
    if(buffers.length === 1) return buffers[0];

    // BWFは考慮しない
    const headerSize = 44;

    // 全体のデータサイズ（ヘッダーを除いた純粋な音声データの合計）を計算
    let totalDataLength = 0;
    for(const buffer of buffers){
        totalDataLength += buffer.length - headerSize;
    }

    // 新しい結合用バッファをメモリ上に確保
    const outBuffer = Buffer.alloc(headerSize + totalDataLength);

    // 1つ目のWAVのヘッダーをコピー
    buffers[0].copy(outBuffer, 0, 0, headerSize);

    // ヘッダーのサイズ情報を新しいサイズに書き換え（WAVの仕様準拠）
    outBuffer.writeUInt32LE(headerSize + totalDataLength - 8, 4);  // RIFF chunk size
    outBuffer.writeUInt32LE(totalDataLength, headerSize - 4);      // data chunk size

    // 各バッファの音声データ部分を順番に書き込む
    let offset = headerSize;
    for(const buffer of buffers){
        const dataLength = buffer.length - headerSize;
        buffer.copy(outBuffer, offset, headerSize);
        offset += dataLength;
    }

    return outBuffer;
}

const playerQueues = new WeakMap();

/**
 * プレイヤーに対応するキューを取得または作成する
 * @param {object} player 
 * @returns {Array} queue
 */
function getQueue(player) {
    return playerQueues.get(player) ?? playerQueues.set(player, []).get(player);
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
