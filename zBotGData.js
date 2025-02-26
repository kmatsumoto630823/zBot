require("dotenv").config();

const envDefaultSpeakerEngine = process.env.defaultSpeakerEngine;
const envDefaultSpeakerId     = parseInt(process.env.defaultSpeakerId);

const envDefaultSpeakerSpeedScale      = Number(process.env.defaultSpeakerSpeedScale);
const envDefaultSpeakerPitchScale      = Number(process.env.defaultSpeakerPitchScale);
const envDefaultSpeakerIntonationScale = Number(process.env.defaultSpeakerIntonationScale);
const envDefaultSpeakerVolumeScale     = Number(process.env.defaultSpeakerVolumeScale);

const envGuildConfigsDir      = process.env.guildConfigsDir;
const envGuildDictionariesDir = process.env.guildDictionariesDir;

const fs = require("fs");
const crypto = require("crypto");


const zBotGData = {
    "zBotGuildConfigs":      {},
    "zBotGuildDictionaries": {},
    "zBotGuildQueues":       {},

    "initGuildConfigIfUndefined": function(guildId){
        this.zBotGuildConfigs[guildId] ??= {};

        this.zBotGuildConfigs[guildId].textChannelId        ??= "";
        this.zBotGuildConfigs[guildId].voiceChannelId       ??= "";
        this.zBotGuildConfigs[guildId].isReactionSpeach     ??= true;
        this.zBotGuildConfigs[guildId].excludeRegEx         ??= "(?!)";
        this.zBotGuildConfigs[guildId].memberSpeakerConfigs ??= {};

        return this.zBotGuildConfigs[guildId];
    },

    "initGuildConfig": function(guildId){
        this.zBotGuildConfigs[guildId] = {};

        return this.initGuildConfigIfUndefined(guildId);
    },

    "initMemberSpeakerConfigIfUndefined": function(guildId, memberId){
        this.initGuildConfigIfUndefined(guildId);

        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId] ??= {};

        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].engine ??= envDefaultSpeakerEngine;
        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].id     ??= envDefaultSpeakerId;

        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].speedScale      ??= envDefaultSpeakerSpeedScale;
        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].pitchScale      ??= envDefaultSpeakerPitchScale;
        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].intonationScale ??= envDefaultSpeakerIntonationScale;
        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].volumeScale     ??= envDefaultSpeakerVolumeScale;

        return this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId];
    },

    "initMemberSpeakerConfig": function(guildId, memberId){
        this.initGuildConfigIfUndefined(guildId);

        this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId] = {};

        return this.initMemberSpeakerConfigIfUndefined(guildId, memberId);
    },

    "initGuildDictionaryIfUndefined": function(guildId){
        this.zBotGuildDictionaries[guildId] ??= {};

        return this.zBotGuildDictionaries[guildId];
    },

    "initGuildDictionary": function(guildId){
        this.zBotGuildDictionaries[guildId] = {};

        return this.initGuildDictionaryIfUndefined(guildId);
    },

    "initGuildQueueIfUndefined": function(guildId){
        this.zBotGuildQueues[guildId] ??= [];

        return this.zBotGuildQueues[guildId];
    },

    "initGuildQueue": function(guildId){
        this.zBotGuildQueues[guildId] = [];

        return this.initGuildQueueIfUndefined(guildId);
    },

    "restoreConfig": function(guildId){
        const path = envGuildConfigsDir + "/" + String(guildId) + ".json";

        //const crypto = require("crypto");
        const uuidPropertyName = crypto.createHash("md5").update(`GUILD-CONFIG-${guildId}`).digest("hex");
        const uuid = crypto.randomUUID();
    
        try{
            //const fs = require("fs");
            const text = fs.readFileSync(path);
            this.zBotGuildConfigs[guildId] = JSON.parse(text);
        }catch{
            this.initGuildConfigIfUndefined(guildId);
        }

        this.zBotGuildConfigs[guildId][uuidPropertyName] ??= uuid;

        return true;
    },

    "saveConfig": function(guildId){
        const path = envGuildConfigsDir + "/" + String(guildId) + ".json";

        //const crypto = require("crypto");
        const uuidPropertyName = crypto.createHash("md5").update(`GUILD-CONFIG-${guildId}`).digest("hex");
        const uuid = this.zBotGuildConfigs[guildId][uuidPropertyName];

        try{
            //const fs = require("fs");
            const text = fs.readFileSync(path);

            if(text.includes(uuidPropertyName) && !text.includes(uuid)) return false;

            //const fs = require("fs");
            fs.writeFileSync(path, JSON.stringify(this.zBotGuildConfigs[guildId]));
        }catch{
            return false;
        }

        return true;
    },

    "restoreDictionary": function(guildId){
        const path = envGuildDictionariesDir + "/" + String(guildId) + ".json";

       //const crypto = require("crypto");
       const uuidPropertyName = crypto.createHash("md5").update(`GUILD-DICTIONARY-${guildId}`).digest("hex");
       const uuid = crypto.randomUUID();
    
        try{
            //const fs = require("fs");
            const text = fs.readFileSync(path);
            this.zBotGuildDictionaries[guildId] = JSON.parse(text);
        }catch{
            this.initGuildDictionaryIfUndefined(guildId);
        }

        this.zBotGuildDictionaries[guildId][uuidPropertyName] ??= uuid;

        return true;
    },

    "saveDictionary": function(guildId){
        const path = envGuildDictionariesDir + "/" + String(guildId) + ".json";

        //const crypto = require("crypto");
        const uuidPropertyName = crypto.createHash("md5").update(`GUILD-DICTIONARY-${guildId}`).digest("hex");
        const uuid = this.zBotGuildDictionaries[guildId][uuidPropertyName];

        try{
            //const fs = require("fs");
            const text = fs.readFileSync(path);

            if(text.includes(uuidPropertyName) && !text.includes(uuid)) return false;

            //const fs = require("fs");
            fs.writeFileSync(path, JSON.stringify(this.zBotGuildDictionaries[guildId]));
        }catch{
            return false;
        }

        return true;
    },

    "deleteGuildData": function(guildId){           
        delete this.zBotGuildConfigs[guildId];
        delete this.zBotGuildDictionaries[guildId];
        delete this.zBotGuildQueues[guildId];
        
        return;
    }
};

module.exports = zBotGData;
 