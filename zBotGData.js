require("dotenv").config();

// 環境変数の存在チェック
require("./utils/chkEnvVars")([
    "defaultSpeakerEngine",
    "defaultSpeakerId",
    "defaultSpeakerSpeedScale",
    "defaultSpeakerPitchScale",
    "defaultSpeakerIntonationScale",
    "defaultSpeakerVolumeScale",
    "guildConfigsDir",
    "guildDictionariesDir"
]);

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

/**
 * グローバルデータを管理するクラス
 */
function zBotGData(){
    this.zBotGuildConfigs      = {};
    this.zBotGuildDictionaries = {};
    this.zBotGuildQueues       = {};
}

/**
 * ギルド設定を取得する(未定義の場合は初期化を実施)
 * @param {string} guildId - ギルドID
 * @returns {object} - ギルド設定
 */
zBotGData.prototype.initGuildConfigIfUndefined = function(guildId){
    this.zBotGuildConfigs[guildId] ??= {};

    this.zBotGuildConfigs[guildId].textChannelId        ??= "";
    this.zBotGuildConfigs[guildId].voiceChannelId       ??= "";
    this.zBotGuildConfigs[guildId].isReactionSpeach     ??= true;
    this.zBotGuildConfigs[guildId].excludeRegEx         ??= "(?!)";
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs ??= {};

    return this.zBotGuildConfigs[guildId];
}

/**
 * ギルド設定を初期化する
 * @param {string} guildId - ギルドID
 * @returns {object} - ギルド設定
 */
zBotGData.prototype.initGuildConfig = function(guildId){
    this.zBotGuildConfigs[guildId] = {};

    return this.initGuildConfigIfUndefined(guildId);
}

/**
 * メンバーのスピーカー設定を取得する(未定義の場合は初期化を実施)
 * @param {string} guildId - ギルドID
 * @param {string} memberId - メンバーID
 * @returns {object} - メンバーのスピーカー設定
 */
zBotGData.prototype.initMemberSpeakerConfigIfUndefined = function(guildId, memberId){
    this.initGuildConfigIfUndefined(guildId);

    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId] ??= {};

    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].engine ??= envDefaultSpeakerEngine;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].id     ??= envDefaultSpeakerId;

    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].speedScale      ??= envDefaultSpeakerSpeedScale;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].pitchScale      ??= envDefaultSpeakerPitchScale;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].intonationScale ??= envDefaultSpeakerIntonationScale;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].volumeScale     ??= envDefaultSpeakerVolumeScale;

    return this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId];
}

/**
 * メンバーのスピーカーを初期化する
 * @param {string} guildId - ギルドID
 * @param {string} memberId - メンバーID
 * @returns {object} - メンバーのスピーカー設定
 */
zBotGData.prototype.initMemberSpeakerConfig = function(guildId, memberId){
    this.initGuildConfigIfUndefined(guildId);

    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId] = {};

    return this.initMemberSpeakerConfigIfUndefined(guildId, memberId);
}

/**
 * ギルドの辞書を取得する(未定義の場合は初期化を実施)
 * @param {string} guildId - ギルドID
 * @returns {object} - ギルドの辞書
 */
zBotGData.prototype.initGuildDictionaryIfUndefined = function(guildId){
    this.zBotGuildDictionaries[guildId] ??= {};

    return this.zBotGuildDictionaries[guildId];
}

/**
 * ギルドの辞書を初期化する
 * @param {string} guildId - ギルドID
 * @returns {object} - ギルドの辞書
 */
zBotGData.prototype.initGuildDictionary = function(guildId){
    this.zBotGuildDictionaries[guildId] = {};

    return this.initGuildDictionaryIfUndefined(guildId);
}

/**
 * ギルドのキューを取得する(未定義の場合は初期化を実施)
 * @param {string} guildId - ギルドID
 * @returns {object} - ギルドのキュー
 */
zBotGData.prototype.initGuildQueueIfUndefined = function(guildId){
    this.zBotGuildQueues[guildId] ??= [];

    return this.zBotGuildQueues[guildId];
}

/**
 * ギルドのキューを初期化する
 * @param {string} guildId - ギルドID
 * @returns {object} - ギルドのキュー
 */
zBotGData.prototype.initGuildQueue = function(guildId){
    this.zBotGuildQueues[guildId] = [];

    return this.initGuildQueueIfUndefined(guildId);
}

/**
 * 設定/辞書を復元する(内部処理用)
 * @param {string} guildId - ギルドID
 * @param {string} path - ファイルパス
 * @param {object} target - 保存するオブジェクト(this.zBotGuildConfigs or this.zBotGuildDictionaries)
 * @param {function} initFunc - 初期化する関数(this.initGuildConfigIfUndefined or this.initGuildDictionaryIfUndefined)
 */
zBotGData.prototype.restoreData = function(guildId, path, target, initFunc){
    try{
        const json = fs.readFileSync(path);
        const obj = JSON.parse(json);

        // 読み込んだデータを元にハッシュ値を計算し、obj.__hash__ に設定(整合性確認用)
        const hash = crypto.createHash("sha256").update(json).digest("hex");
        obj.__hash__ = hash;

        target[guildId] = obj;
    }catch(e){
         // エラーコードがENOENTの場合、ファイルが存在しないので、初期化処理を行う
        if(e.code === "ENOENT"){
            // 初期化関数を実行
            initFunc.call(this, guildId);

            const obj = target[guildId];
            const json = JSON.stringify(obj);

            fs.writeFileSync(path, json);

            // 保存した文字列を元にハッシュ値を計算し、obj.__hash__ に設定(整合性確認用)
            const hash = crypto.createHash("sha256").update(json).digest("hex");
            obj.__hash__ = hash;
        }else{
            console.error(`Failed to read or parse file: ${path} (Guild: ${guildId})`, e);
            return false;
        }
    }
    
    return true;
}

/**
 * 設定/辞書を保存する(内部処理用)
 * @param {string} guildId - ギルドID
 * @param {string} path - ファイルパス
 * @param {object} target - 保存するオブジェクト(this.zBotGuildConfigs or this.zBotGuildDictionaries)
 */
zBotGData.prototype.saveData = function(guildId, path, target){
    try{
        const obj  = target[guildId];
        const hash1 = obj.__hash__;
    
        const json = fs.readFileSync(path);
        const hash2 = crypto.createHash("sha256").update(json).digest("hex");
    
        // 事前に取得したハッシュ値と現在のファイルのハッシュ値が一致しない場合(データが変更されている)
        if(hash1 !== hash2) return false;
    
        delete obj.__hash__;
        fs.writeFileSync(path, JSON.stringify(obj));
    }catch(e){
        console.error(`Failed to save file: ${path} (Guild: ${guildId})`, e);
        return false;
    }

    return true;
}

/**
 * ギルドの設定を復元する
 * @param {string} guildId - ギルドID
 */
zBotGData.prototype.restoreConfig = function(guildId){
    const path = envGuildConfigsDir + "/" + String(guildId) + ".json";
    return this.restoreData(guildId, path, this.zBotGuildConfigs, this.initGuildConfigIfUndefined)
}

/**
 * ギルドの設定を保存する
 * @param {string} guildId - ギルドID
 */
zBotGData.prototype.saveConfig = function(guildId){
    const path = envGuildConfigsDir + "/" + String(guildId) + ".json";
    return this.saveData(guildId, path, this.zBotGuildConfigs);
}

/**
 * ギルドの辞書を復元する
 * @param {string} guildId - ギルドID
 */
zBotGData.prototype.restoreDictionary = function(guildId){
    const path = envGuildDictionariesDir + "/" + String(guildId) + ".json";
    return this.restoreData(guildId, path, this.zBotGuildDictionaries, this.initGuildDictionaryIfUndefined)
}

/**
 * ギルドの辞書を保存する
 * @param {string} guildId - ギルドID
 */
zBotGData.prototype.saveDictionary = function(guildId){
    const path = envGuildDictionariesDir + "/" + String(guildId) + ".json";
    return this.saveData(guildId, path, this.zBotGuildDictionaries);
}

/**
 * ギルドのデータを削除する
 * @param {string} guildId - ギルドID
 */
zBotGData.prototype.deleteGuildData = function(guildId){           
    delete this.zBotGuildConfigs[guildId];
    delete this.zBotGuildDictionaries[guildId];
    delete this.zBotGuildQueues[guildId];
    
    return;
}

module.exports = new zBotGData();
