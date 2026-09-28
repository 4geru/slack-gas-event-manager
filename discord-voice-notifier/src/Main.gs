/**
 * Main.gs
 * Discordボイスチャンネルの入室検知とSlack通知のエントリポイント。
 *
 * Discordは在室状態の変化をWebhookで通知できないため、時間主導トリガーで
 * widget.json を定期ポーリングし、前回取得時点との差分から新規入室者を検出する
 * 方式を取っている（DiscordWidget.gs 冒頭コメント参照）。
 */

const PROP_PREV_VOICE_STATE = 'PREV_VOICE_STATE';

/**
 * 時間主導トリガーから呼び出すエントリポイント。
 * 前回ポーリング結果と比較して新規入室者を検出し、Slackへ通知する。
 */
function checkVoiceChannels() {
  const config = getConfig_();

  let current;
  try {
    current = fetchVoiceMembers_(config.discordGuildId);
  } catch (err) {
    if (err.message === 'RATE_LIMITED') {
      // 一時的なレート制限。状態は前回のまま据え置き、次回(1分後)のポーリングに任せる
      Logger.log('widget.json がレート制限中のため今回はスキップします');
      return;
    }
    throw err;
  }

  const props = PropertiesService.getScriptProperties();
  const prevRaw = props.getProperty(PROP_PREV_VOICE_STATE);
  const prevMemberIdsByChannel = prevRaw ? JSON.parse(prevRaw) : {};

  Object.keys(current.voiceMembersByChannel).forEach(function (channelId) {
    const channelName = current.channelNames[channelId] || channelId;
    const prevMemberIds = prevMemberIdsByChannel[channelId] || [];
    current.voiceMembersByChannel[channelId].forEach(function (member) {
      if (prevMemberIds.indexOf(member.id) === -1) {
        postToSlack_(config.slackWebhookUrl,
          ':microphone: *' + member.username + '* さんが Discord ボイスチャンネル「' + channelName + '」に参加しました');
      }
    });
  });

  const nextMemberIdsByChannel = {};
  Object.keys(current.voiceMembersByChannel).forEach(function (channelId) {
    nextMemberIdsByChannel[channelId] = current.voiceMembersByChannel[channelId].map(function (member) {
      return member.id;
    });
  });
  props.setProperty(PROP_PREV_VOICE_STATE, JSON.stringify(nextMemberIdsByChannel));
}

/**
 * 時間主導トリガーをセットアップする（GASエディタから手動で1回実行する）。
 * 既存の checkVoiceChannels トリガーを削除してから1分間隔で登録し直すため、
 * 何度実行しても重複登録されない。
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'checkVoiceChannels') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('checkVoiceChannels')
    .timeBased()
    .everyMinutes(1)
    .create();
}
