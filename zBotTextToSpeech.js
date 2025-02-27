require("dotenv").config();

const envVoiceServers = process.env.voiceServers;
const envVoiceServerTextLengthLimit = parseInt(process.env.voiceServerTextLengthLimit);

const envSamplingRate = parseInt(process.env.samplingRate);
const envQueueTimeout = parseInt(process.env.queueTimeout);
const envQueueTimeoutInterval = parseInt(process.env.queueTimeoutInterval);

const { setTimeout } = require("timers/promises");
const { entersState, AudioPlayerStatus } = require("@discordjs/voice");

//ToDo:ポーリング方式で一旦実装、PromiseQueue方式でいつかは実装したい
async function zBotTextToSpeech(splitedText, speaker, player, queue){
    const fullTextLength = splitedText.reduce((sum, text) => sum + text.length, 0);
    
    if(fullTextLength > envVoiceServerTextLengthLimit){
        splitedText = ["文字数が上限を超えています"];
    }

    const ticket = Symbol();

    enQueue(queue, ticket);

    let count = Math.floor(envQueueTimeout / envQueueTimeoutInterval);

    while(queue[0] !== ticket){
        if(count === 0){
            deQueue(queue, ticket);
            return;
        }

        //const { setTimeout } = require("timers/promises");
        await setTimeout(envQueueTimeoutInterval);

        if(queue.length === 0){
            return;
        }

        count--;
    }

    const resources = [];

    for(const text of splitedText){
        const resource = await voiceSynthesis(text, speaker);
        resources.push(resource);
    }

    for(const resource of resources){
        //const { entersState, AudioPlayerStatus } = require("@discordjs/voice");
        await entersState(player, AudioPlayerStatus.Idle, envQueueTimeout);

        if(queue.length == 0){
            return;
        }

        if(queue[0] !== ticket){
            deQueue(queue, ticket);
            return;
        }

        player.play(resource);
    }

    deQueue(queue, ticket);

    return;
}

const { Readable } = require("stream");
const { createAudioResource, StreamType } = require("@discordjs/voice");

async function voiceSynthesis(text, speaker){
    const server = getVoiceServers().find( (x) => { return x.engine === speaker.engine; });

    const response_audio_query = await fetch(server.baseURL + "/audio_query?text=" + encodeURIComponent(text) + "&speaker=" + speaker.id, {
        method: "POST",
        headers:{ "accept": "application/json" }
    });

    if(!response_audio_query.ok) return;

    const audioQuery = await response_audio_query.json();

    audioQuery.speedScale       = speaker.speedScale;
    audioQuery.pitchScale       = speaker.pitchScale;
    audioQuery.intonationScale  = speaker.intonationScale;
    audioQuery.volumeScale      = speaker.volumeScale;

    audioQuery.outputSamplingRate = envSamplingRate;

    const response_synthesis = await fetch(server.baseURL + "/synthesis?speaker=" + speaker.id, {
        method: "POST",
        headers: { "accept": "audio/wav", "Content-Type": "application/json" },
        body: JSON.stringify(audioQuery)
    });

    if(!response_synthesis.ok) return;

    //const { Readable } = require("stream");
    const stream = new Readable();

    stream.push(Buffer.from(await response_synthesis.arrayBuffer()));
    stream.push(null);

    //const { createAudioResource, StreamType } = require("@discordjs/voice");
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    
    return resource;
}

function enQueue(queue, ticket){
    if(!queue || !ticket) return;

    queue.push(ticket);
    return;
}

function deQueue(queue, ticket){
    if(!queue || !ticket) return;

    const index = queue.indexOf(ticket);

    if(index !== -1){
        queue.splice(0, index + 1);
    }
    
    return;
}

function getVoiceServers(){
    const servers = [];

    for(const splited of envVoiceServers.split(";")){
        const url = new URL(splited.trim());

        const engine =  url.searchParams.get("engine");
        const baseURL = url.origin;

        if(engine === null) return null;

        servers.push({ "engine": engine, "baseURL": baseURL });
    }

    return servers;
}

module.exports = zBotTextToSpeech;
