
/**
 * 必須環境変数が存在するかチェックし、存在しない場合はエラーを出力して終了する。
 * @param {string[]} requiredEnvVars - 必須環境変数のリスト
 */
function chkEnvVars(requiredEnvVars){
    // 環境変数の存在チェック
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar] || process.env[envVar].trim() === "");
    if(missingEnvVars.length > 0){
        console.error(`Error: Missing required environment variables: ${missingEnvVars.join(", ")}`);
        process.exit(1); // エラー終了
    }
};

module.exports = chkEnvVars;