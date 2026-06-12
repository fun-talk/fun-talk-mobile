import type { RecordingControllerState } from './recordingController';

export type FreeChatPanelViewState = {
  statusText: string;
  helperText: string;
  dotColor: string;
  showPulse: boolean;
  iconOpacity: number;
};

export function getFreeChatPanelViewState(params: {
  assistantPlaybackPending: boolean;
  state: RecordingControllerState;
}): FreeChatPanelViewState {
  const { assistantPlaybackPending, state } = params;

  if (assistantPlaybackPending) {
    return {
      statusText: '欧波正在说话',
      helperText: '麦克风已关闭，等欧波说完后会自动开始收音',
      dotColor: '#0EA5E9',
      showPulse: false,
      iconOpacity: 0.72,
    };
  }

  if (state.status === 'recording' || state.status === 'auto_stopping') {
    return {
      statusText: '正在收音，请说话...',
      helperText: '麦克风已开启，正在听你说话',
      dotColor: '#FC3B19',
      showPulse: true,
      iconOpacity: 1,
    };
  }

  if (state.status === 'recorded') {
    return {
      statusText: '已停录，正在自动提交...',
      helperText: '马上把你的回答发给欧波',
      dotColor: '#F97316',
      showPulse: false,
      iconOpacity: 0.92,
    };
  }

  if (state.status === 'submitted') {
    return {
      statusText: '欧波正在回复你',
      helperText: '请稍等，回复结束后会自动重新打开麦克风',
      dotColor: '#0BCD3F',
      showPulse: false,
      iconOpacity: 0.88,
    };
  }

  if (state.status === 'permission_denied') {
    return {
      statusText: '自由对话开麦失败',
      helperText: '请检查麦克风权限，然后重试',
      dotColor: '#DC2626',
      showPulse: false,
      iconOpacity: 0.88,
    };
  }

  if (state.status === 'error') {
    return {
      statusText: '自由对话开麦失败',
      helperText: state.errorText || '请检查麦克风权限，然后重试',
      dotColor: '#DC2626',
      showPulse: false,
      iconOpacity: 0.88,
    };
  }

  return {
    statusText: '准备和欧波聊聊',
    helperText: `自由对话自动收音 · ${Math.max(0, Math.round(state.durationMs / 1000))}s`,
    dotColor: '#94A3B8',
    showPulse: false,
    iconOpacity: 0.9,
  };
}
