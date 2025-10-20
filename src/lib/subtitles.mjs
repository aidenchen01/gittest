// 纯函数：把 .srt 文本转换成 .vtt 文本
export function srtToVtt(srt) {
  const cleaned = String(srt)
    .replace(/\r+/g, '')
    .replace(/^\uFEFF/, '');         // 去 BOM
  const withoutSeq = cleaned.replace(/^\d+\s*$/gm, ''); // 去序号行
  const withDots = withoutSeq.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return 'WEBVTT\n\n' + withDots.trim() + '\n';
}

// 小工具：格式化秒 -> mm:ss（和播放器 UI 保持一致）
export function fmtTime(sec) {
  if (!isFinite(sec)) return '00:00';
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
