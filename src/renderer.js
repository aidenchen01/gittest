import { srtToVtt, fmtTime } from './lib/subtitles.mjs';
const mediaElement = document.getElementById('media');
const openMediaButton = document.getElementById('openMedia');
const openSubtitleButton = document.getElementById('openSubtitle');
const playbackRateSelect = document.getElementById('playbackRate');
const toggleSettingsButton = document.getElementById('toggleSettings');
const settingsPanel = document.getElementById('settingsPanel');
const seekStepInput = document.getElementById('seekStep');
const showProgressCheckbox = document.getElementById('showProgress');
const fileNameLabel = document.getElementById('fileName');
const progressContainer = document.getElementById('progressContainer');
const progressInput = document.getElementById('progress');
const currentTimeLabel = document.getElementById('currentTime');
const durationLabel = document.getElementById('duration');

let seekStep = 5;
let progressVisible = true;
let subtitleObjectUrl = null;
let subtitleTrackElement = null;

function formatTime(value) {
  if (!Number.isFinite(value)) {
    return '00:00';
  }
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minutePart = String(minutes).padStart(2, '0');
  const secondPart = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${minutePart}:${secondPart}`;
  }
  return `${minutePart}:${secondPart}`;
}

function updateProgress() {
  if (!Number.isFinite(mediaElement.duration) || mediaElement.duration === 0) {
    progressInput.value = '0';
    progressInput.max = '0';
    progressInput.disabled = true;
    currentTimeLabel.textContent = '00:00';
    durationLabel.textContent = '00:00';
    return;
  }

  progressInput.disabled = false;
  progressInput.max = String(mediaElement.duration);
  progressInput.value = String(mediaElement.currentTime);
  currentTimeLabel.textContent = formatTime(mediaElement.currentTime);
  durationLabel.textContent = formatTime(mediaElement.duration);
}

function applyProgressVisibility() {
  progressContainer.classList.toggle('hidden', !progressVisible);
}

async function loadSettings() {
  const storedSeekStep = await window.electronAPI.settings.get('seekStep');
  if (typeof storedSeekStep === 'number' && Number.isFinite(storedSeekStep) && storedSeekStep > 0) {
    seekStep = storedSeekStep;
  }
  seekStepInput.value = String(seekStep);

  const storedProgressVisible = await window.electronAPI.settings.get('showProgressBar');
  if (typeof storedProgressVisible === 'boolean') {
    progressVisible = storedProgressVisible;
  }
  showProgressCheckbox.checked = progressVisible;
  applyProgressVisibility();
}

function cleanupSubtitle() {
  if (subtitleTrackElement && subtitleTrackElement.parentElement) {
    subtitleTrackElement.remove();
  }
  subtitleTrackElement = null;
  if (subtitleObjectUrl) {
    URL.revokeObjectURL(subtitleObjectUrl);
    subtitleObjectUrl = null;
  }
}

function convertSrtToVtt(srtText) {
  const withoutBom = srtText.replace(/\uFEFF/g, '');
  const normalized = withoutBom.replace(/\r/g, '').trim();
  if (!normalized) {
    return 'WEBVTT\n\n';
  }

  const blocks = normalized.split(/\n\n+/);
  const convertedBlocks = blocks.map(block => {
    const lines = block.split('\n');
    if (!lines.length) {
      return '';
    }
    if (/^\d+$/.test(lines[0].trim())) {
      lines.shift();
    }
    if (lines.length) {
      lines[0] = lines[0].replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    }
    return lines.join('\n');
  });

  return `WEBVTT\n\n${convertedBlocks.join('\n\n')}`;
}

async function handleOpenMedia() {
  const result = await window.electronAPI.openMediaFile();
  if (!result) {
    return;
  }

  const fileUrl = window.electronAPI.pathToFileURL(result.path);
  cleanupSubtitle();
  mediaElement.src = fileUrl;
  mediaElement.load();
  mediaElement.play().catch(() => {});
  fileNameLabel.textContent = result.name;
}

async function handleOpenSubtitle() {
  const result = await window.electronAPI.openSubtitleFile();
  if (!result) {
    return;
  }

  let vttContent;
  if (result.extension === '.srt') {
    vttContent = convertSrtToVtt(result.content);
  } else {
    vttContent = result.content.replace(/\uFEFF/g, '');
    if (!vttContent.trim().startsWith('WEBVTT')) {
      vttContent = `WEBVTT\n\n${vttContent.trim()}`;
    }
  }

  const blob = new Blob([vttContent], { type: 'text/vtt' });
  const objectUrl = URL.createObjectURL(blob);
  cleanupSubtitle();
  subtitleObjectUrl = objectUrl;

  const track = document.createElement('track');
  track.kind = 'subtitles';
  track.label = result.name;
  track.srclang = 'zh';
  track.default = true;
  track.src = objectUrl;
  mediaElement.appendChild(track);
  subtitleTrackElement = track;
}

function toggleSettingsPanel() {
  settingsPanel.classList.toggle('visible');
}

function handleSeekStepChange(event) {
  const value = Number.parseFloat(event.target.value);
  if (!Number.isFinite(value) || value <= 0) {
    event.target.value = String(seekStep);
    return;
  }
  seekStep = value;
  window.electronAPI.settings.put('seekStep', seekStep);
}

function handleShowProgressChange(event) {
  progressVisible = event.target.checked;
  applyProgressVisibility();
  window.electronAPI.settings.put('showProgressBar', progressVisible);
}

function handleProgressInput(event) {
  if (!Number.isFinite(mediaElement.duration) || mediaElement.duration === 0) {
    return;
  }
  const value = Number.parseFloat(event.target.value);
  if (!Number.isFinite(value)) {
    return;
  }
  mediaElement.currentTime = value;
  currentTimeLabel.textContent = formatTime(value);
}

function handlePlaybackRateChange(event) {
  const rate = Number.parseFloat(event.target.value);
  if (!Number.isFinite(rate) || rate <= 0) {
    return;
  }
  mediaElement.playbackRate = rate;
}

function syncPlaybackRateSelect() {
  const rate = mediaElement.playbackRate;
  const existingOption = Array.from(playbackRateSelect.options).find(option => Number(option.value) === rate);
  if (!existingOption) {
    const option = document.createElement('option');
    option.value = String(rate);
    option.textContent = `${rate.toFixed(2)}x`;
    playbackRateSelect.appendChild(option);
  }
  playbackRateSelect.value = String(rate);
}

function handleKeyboardShortcuts(event) {
  if (event.defaultPrevented) {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
    return;
  }

  if (!Number.isFinite(mediaElement.duration) || mediaElement.duration === 0) {
    return;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const delta = seekStep * direction;
    const targetTime = Math.min(
      mediaElement.duration,
      Math.max(0, mediaElement.currentTime + delta)
    );
    mediaElement.currentTime = targetTime;
    updateProgress();
  }
}

function resetPlayerState() {
  fileNameLabel.textContent = '未选择';
  cleanupSubtitle();
  updateProgress();
}

function init() {
  resetPlayerState();
  loadSettings();
  applyProgressVisibility();

  openMediaButton.addEventListener('click', handleOpenMedia);
  openSubtitleButton.addEventListener('click', handleOpenSubtitle);
  toggleSettingsButton.addEventListener('click', toggleSettingsPanel);
  seekStepInput.addEventListener('change', handleSeekStepChange);
  showProgressCheckbox.addEventListener('change', handleShowProgressChange);
  progressInput.addEventListener('input', handleProgressInput);
  playbackRateSelect.addEventListener('change', handlePlaybackRateChange);
  document.addEventListener('keydown', handleKeyboardShortcuts);

  mediaElement.addEventListener('loadedmetadata', () => {
    updateProgress();
    syncPlaybackRateSelect();
  });

  mediaElement.addEventListener('timeupdate', updateProgress);
  mediaElement.addEventListener('ratechange', syncPlaybackRateSelect);
  mediaElement.addEventListener('emptied', updateProgress);
}

init();
