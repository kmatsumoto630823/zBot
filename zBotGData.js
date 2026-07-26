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

const envDefaultSpeakerSpeedScale          = Number(process.env.defaultSpeakerSpeedScale);
const envDefaultSpeakerPitchScale          = Number(process.env.defaultSpeakerPitchScale);
const envDefaultSpeakerIntonationScale     = Number(process.env.defaultSpeakerIntonationScale);
const envDefaultSpeakerVolumeScale         = Number(process.env.defaultSpeakerVolumeScale);
const envDefaultSpeakerTempoDynamicsScale  = Number(process.env.defaultSpeakerTempoDynamicsScale);

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

    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].speedScale         ??= envDefaultSpeakerSpeedScale;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].pitchScale         ??= envDefaultSpeakerPitchScale;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].intonationScale    ??= envDefaultSpeakerIntonationScale;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].volumeScale        ??= envDefaultSpeakerVolumeScale;
    this.zBotGuildConfigs[guildId].memberSpeakerConfigs[memberId].tempoDynamicsScale ??= envDefaultSpeakerTempoDynamicsScale;

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
 * 設定/辞書を復元する(内部処理用)
 * @param {string} guildId - ギルドID
 * @param {string} path - ファイルパス
 * @param {object} target - 保存するオブジェクト(this.zBotGuildConfigs or this.zBotGuildDictionaries)
 * @param {function} initFunc - 初期化する関数(this.initGuildConfigIfUndefined or this.initGuildDictionaryIfUndefined)
 */
zBotGData.prototype.restoreData = function(guildId, path, target, initFunc){
    let json = "";
    let obj = null;

    try{
        // ファイルがあれば読み込む
        json = fs.readFileSync(path, "utf8");
        obj = JSON.parse(json);
    }catch(error){
        if(error.code === "ENOENT"){
            // ファイルが無い場合：初期データを構築し、新規ファイルとして保存
            initFunc.call(this, guildId);
            obj = target[guildId];
            json = JSON.stringify(obj);
            fs.writeFileSync(path, json);
        }else{
            throw new Error(`Failed to read or parse file: ${path} (Guild: ${guildId}). Details: ${error.message}`);
        }
    }

    // ハッシュを付与
    const hash = crypto.createHash("sha256").update(json).digest("hex");
    
    Object.defineProperty(obj, "__hash__", {
        value: hash,
        enumerable: false, // JSON.stringify に含まれない
        writable: true,    // 後で再代入可能
        configurable: true
    });

    target[guildId] = obj;
    
    return true;
}

/**
 * 設定/辞書を保存する(内部処理用)
 * @param {string} guildId - ギルドID
 * @param {string} path - ファイルパス
 * @param {object} target - 保存するオブジェクト(this.zBotGuildConfigs or this.zBotGuildDictionaries)
 */
zBotGData.prototype.saveData = function(guildId, path, target){
    const obj = target[guildId];
    if(!obj) return false;

    const hash1 = obj.__hash__;

    try{
        // 現在のファイルを読み込み、hash2を計算する
        const json = fs.readFileSync(path, "utf8");
        const hash2 = crypto.createHash("sha256").update(json).digest("hex");

        // ハッシュが完全一致しない場合は例外を投げる
        if(hash1 !== hash2){
            throw new Error(`Data mismatch for guild ${guildId}: expected hash ${hash1}, got ${hash2}`);
        }

        // 書き込みとハッシュ更新
        const newJson = JSON.stringify(obj);
        fs.writeFileSync(path, newJson);
        obj.__hash__ = crypto.createHash("sha256").update(newJson).digest("hex");

    }catch(error) {
        // ハッシュ不一致、ファイル消失などすべての異常をここでキャッチして保存をブロック
        throw new Error(`Failed to save file: ${path} (Guild: ${guildId}). Details: ${error.message}`);
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
    
    return;
}

module.exports = new zBotGData();
