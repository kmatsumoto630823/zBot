# zBot
音声変換にVOICEVOX（とその互換エンジン）を利用したDiscord用読み上げTTSBotです  
複数のサーバー（ギルド）でも動作するように設計してますが、基本的には小規模運用想定となります  
DBは使わずサーバーごとの設定ファイルでストア・リストアを行います  
ファイルへのストア時は、事前に取得したハッシュ値との比較を行い差異があれば書き込まない仕様です  
話者の情報はBot起動時にAPIで取得するので、VOICEVOXの話者の追加にはBotの再起動で追随できます  
※VOICEVOXエンジンへのリクエストのキャッシュや負荷分散はNGINXで試行錯誤中です・・・  

# 使い方(Slach Commnad)
/connect  
    ・・・ボットを接続します  
/list  
    ・・・話者IDの一覧を表示します  
/speaker  
    ・・・話者を変更します  
※話者の候補一覧を表示しますがDiscordの表示上限が25なので、キーワードで適度に削ってから選択してください  
/random  
    ・・・話者をランダムに変更します  
/speed  
    ・・・話者の話速を変更します  
/pitch  
    ・・・話者の音高を変更します  
/intonation  
    ・・・話者の抑揚を変更します  
/volume  
    ・・・話者の音量を変更します  
/dict  
    ・・・単語または絵文字の読みを辞書登録します  
/ghost  
    ・・・隠れてそっと発言します  
/reaction  
    ・・・リアクションスタンプ読み上げの有効・無効を切り替えます  
/exclude  
    ・・・読み上げの除外パターン（正規表現）を設定します  
/export  
    ・・・ギルドの設定をエクスポートします  
/disconnect  
    ・・・ボットを切断します  
/help  
    ・・・ヘルプを表示します    

# Dependencies(というよりは自分の環境)
- Redhat Enterprise Linux 9（Minimal + Development Tools）またはWindows 11
- Node.js v20
- NPM Packages
  - "@discordjs/opus" ※Windowsので導入失敗する場合は"opusscript"を指定
  - "@discordjs/voice"
  - "discord.js"
  - "dotenv"
  - "ffmpeg-static"
  - "sodium" ※Windowsので導入失敗する場合は"tweetnacl"を指定

@discordjs/voiceの依存パッケージは代替できるものがあるので各自の判断で読み替えること  
https://discordjs.guide/voice/#extra-dependencies

# 導入方法
前提としてDiscordのBotアカウントの作成及びVOICEVOXサーバーは準備できているものとします  
また、Node.js環境は各OSに応じた方法で準備してください

Bot用のディレクトリ作成※以降はこのディレクトリで作業  
gitコマンドでファイル一式を配置  
必要なパッケージをnpmコマンドで導入  
ディレクトリ「guild_configs」と「guild_dictionaries」を作成  
env_sampleを参考にご各自の環境に適した.envを作成  
node index.jsでBotを実行してください  

## Linux上での例
```
$ mkdir your_bot_dir
$ cd your_bot_dir

$ npm init
$ npm install discord.js
$ npm install @discordjs/voice
$ npm install @discordjs/opus
$ npm install ffmpeg-static
$ npm install sodium
$ npm install dotenv

$ git clone https://github.com/kmatsumoto630823/zbot .

$ mkdir guild_configs
$ mkdir guild_dictionaries
$ cp env_sample .env
$ vi .env
```

viが立ち上がるので各自の環境に合わせて編集してください  
tokenにはBotアカウントのトークンを    
serverIdsには対象サーバーのIDをセミコロン区切りで記載  
voiceServersにはhttp://[ホスト名]:[ポート]#[エンジン名]の形で記載  

※VOICEVOX互換のAPIならセミコロン区切りで複数指定可能、[エンジン名]は同じものを指定しないでください  
※/listコマンド等、話者の表記にも使用されますので規約に準拠するためにVOICEVOXやSHAREVOXなど正式名称での指定をお願いします
```
# Overwrite below configs with your environment.
token = "Your token"
serverIds = "Your server IDs separated by semicolon(;)"

# voiceServers = "http://localhost:50021#VOICEVOX;http://localhost:50025#SHAREVOX"
voiceServers = "http://localhost:50021#VOICEVOX"

voiceServerTextLengthLimit = 160

guildConfigsDir      = "./guild_configs"
guildDictionariesDir = "./guild_dictionaries"

～中略～
```

準備ができたら実行します
```
$ node index.js
```

※自分はpm2で簡易的に管理してます

# Author
kmatsumoto630823

k.matsumoto.s630823@gmail.com

# License
MIT License

詳細はLicenseファイルをお読みください

