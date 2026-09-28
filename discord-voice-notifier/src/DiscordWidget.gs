/**
 * DiscordWidget.gs
 * Discordのサーバーウィジェット（widget.json）からボイスチャンネル在室者を取得する。
 *
 * Discordはボイス状態の変化を外部へpushするWebhookを提供しておらず、
 * 常時接続のGateway（WebSocket）を張るBotでしかリアルタイム検知できない。
 * GASのようなリクエスト駆動の実行環境ではGatewayを維持できないため、
 * サーバー設定で有効化できる「ウィジェット」の公開JSONを定期ポーリングするのが
 * Botを作らずに実現できる現実的な唯一の手段。
 * 事前に対象サーバーの「サーバー設定 > ウィジェット」を有効化しておくこと。
 */

/**
 * widget.json を取得し、チャンネル名一覧と在室メンバー一覧を返す。
 * ウィジェットが無効な場合や取得に失敗した場合は例外を投げる。
 *
 * 注意: メンバーの id はDiscordが匿名化した値であり実際のユーザーIDではない
 * （ウィジェットの仕様によるプライバシー保護）。本スクリプトではポーリング間の
 * 在室差分検知にしか使わないため実IDでなくても支障はないが、メンションや
 * DM送信など「実ユーザーを特定する」用途には使えない点に注意。
 *
 * レート制限(HTTP 429)は一時的なもので、1分後の次回ポーリングで自然に
 * 回復するため致命的エラーとは区別し、呼び出し元が判定できるよう
 * RATE_LIMITED を投げる（GASのUrlFetchAppはGoogle側の共有IPから発信されるため、
 * 自分の呼び出し頻度と無関係に他スクリプトの影響で発生し得る）。
 */
function fetchVoiceMembers_(guildId) {
  const url = 'https://discord.com/api/guilds/' + encodeURIComponent(guildId) + '/widget.json';
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const status = response.getResponseCode();
  if (status === 429) {
    throw new Error('RATE_LIMITED');
  }
  if (status !== 200) {
    throw new Error('widget.json の取得に失敗しました（HTTP ' + status + '）。' +
      'サーバー設定でウィジェットが有効になっているか確認してください: ' + response.getContentText());
  }

  const data = JSON.parse(response.getContentText());

  const channelNames = {};
  (data.channels || []).forEach(function (channel) {
    channelNames[channel.id] = channel.name;
  });

  const voiceMembersByChannel = {};
  (data.members || []).forEach(function (member) {
    if (!member.channel_id) return; // ボイスチャンネル未参加のメンバーは channel_id を持たない
    const channelId = member.channel_id;
    if (!voiceMembersByChannel[channelId]) voiceMembersByChannel[channelId] = [];
    voiceMembersByChannel[channelId].push({ id: member.id, username: member.username });
  });

  return { channelNames: channelNames, voiceMembersByChannel: voiceMembersByChannel };
}
