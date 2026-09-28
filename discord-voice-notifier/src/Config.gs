/**
 * Config.gs
 * スクリプトプロパティから設定値を読み込む。
 * ソースコード内に固有情報（トークン・ID類）をハードコードしないこと。
 * 実際の値は GAS エディタの「プロジェクトの設定 > スクリプト プロパティ」に登録する。
 */

/**
 * スクリプトプロパティを読み込んで返す。
 * 必須キーが未設定の場合は例外を投げてセットアップ漏れを検知する。
 */
function getConfig_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const config = {
    discordGuildId: props['DISCORD_GUILD_ID'] || null,   // 例: 123456789012345678
    slackWebhookUrl: props['SLACK_WEBHOOK_URL'] || null   // Slack Incoming Webhook URL
  };

  const required = ['DISCORD_GUILD_ID', 'SLACK_WEBHOOK_URL'];
  const missing = required.filter(function (key) { return !props[key]; });
  if (missing.length > 0) {
    throw new Error('スクリプトプロパティが未設定です: ' + missing.join(', '));
  }
  return config;
}
