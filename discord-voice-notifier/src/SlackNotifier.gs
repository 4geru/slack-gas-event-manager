/**
 * SlackNotifier.gs
 * Slack Incoming Webhook へメッセージを投稿する。
 */

/**
 * Slack Incoming Webhook へテキストメッセージを投稿する。
 */
function postToSlack_(webhookUrl, text) {
  UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true
  });
}
