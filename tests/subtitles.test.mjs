import { describe, it, expect } from 'vitest';
import { srtToVtt, fmtTime } from '../src/lib/subtitles.mjs';

describe('srtToVtt', () => {
  it('converts commas to dots and adds WEBVTT header', () => {
    const srt = `1
00:00:01,000 --> 00:00:03,500
Hello

2
00:00:04,000 --> 00:00:05,000
World`;
    const vtt = srtToVtt(srt);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:01.000 --> 00:00:03.500');
    expect(vtt).not.toMatch(/^\d+\s*$/m); // 没有序号行
  });
});

describe('fmtTime', () => {
  it('formats seconds to mm:ss', () => {
    expect(fmtTime(0)).toBe('00:00');
    expect(fmtTime(5)).toBe('00:05');
    expect(fmtTime(65)).toBe('01:05');
  });
});
