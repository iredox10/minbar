/**
 * audioClip.ts
 * Generates a WAV audio clip from a remote audio URL using the Web Audio API.
 * No external dependencies — pure browser APIs.
 */

export interface ClipOptions {
  audioUrl: string;
  startSec: number;
  durationSec: number; // how many seconds to clip (max 60)
  onProgress?: (pct: number) => void; // 0–100
}

export interface ClipResult {
  blob: Blob;
  filename: string;
  actualDurationSec: number;
}

/**
 * Fetches, decodes, slices, and encodes a WAV clip from a remote audio URL.
 */
export async function generateAudioClip(opts: ClipOptions): Promise<ClipResult> {
  const { audioUrl, startSec, durationSec, onProgress } = opts;

  onProgress?.(5);

  // 1. Fetch the audio file
  let arrayBuffer: ArrayBuffer;
  try {
    const response = await fetch(audioUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    arrayBuffer = await response.arrayBuffer();
  } catch {
    // CORS fallback: try a proxy
    const proxied = `https://corsproxy.io/?${encodeURIComponent(audioUrl)}`;
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error(`Failed to fetch audio (proxy): HTTP ${resp.status}`);
    arrayBuffer = await resp.arrayBuffer();
  }

  onProgress?.(40);

  // 2. Decode with Web Audio API
  const audioContext = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }

  onProgress?.(70);

  // 3. Determine clip boundaries
  const totalDuration = decoded.duration;
  const clampedStart = Math.max(0, Math.min(startSec, totalDuration));
  const clampedDuration = Math.min(durationSec, totalDuration - clampedStart);

  const sampleRate = decoded.sampleRate;
  const numChannels = decoded.numberOfChannels;
  const startSample = Math.floor(clampedStart * sampleRate);
  const clipSamples = Math.floor(clampedDuration * sampleRate);

  // 4. Extract channel data for the clip window
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const full = decoded.getChannelData(ch);
    channelData.push(full.subarray(startSample, startSample + clipSamples));
  }

  onProgress?.(85);

  // 5. Encode to WAV (16-bit PCM)
  const wavBlob = encodeWAV(channelData, sampleRate, numChannels, clipSamples);

  onProgress?.(100);

  const filename = `muslim-central-clip-${Math.floor(clampedStart)}s.wav`;

  return {
    blob: wavBlob,
    filename,
    actualDurationSec: clampedDuration,
  };
}

// ---------------------------------------------------------------------------
// WAV encoder — pure JS, no dependencies
// Produces a standard PCM WAV file (RIFF/WAVE/fmt/data chunks)
// ---------------------------------------------------------------------------

function encodeWAV(
  channels: Float32Array[],
  sampleRate: number,
  numChannels: number,
  numSamples: number
): Blob {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);      // file size - 8
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);               // sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true);                // audio format (PCM = 1)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channel samples and write as 16-bit signed int
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = channels[ch][i];
      // Clamp and convert float32 (-1..1) to int16
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, Math.round(int16), true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Build the share caption text for a track.
 */
export function buildShareCaption(opts: {
  title: string;
  speaker?: string;
  startSec: number;
  durationSec: number;
}): string {
  const { title, speaker, startSec, durationSec } = opts;
  const appUrl = window.location.origin;
  const mins = Math.floor(startSec / 60);
  const secs = Math.floor(startSec % 60);
  const timestamp = `${mins}:${secs.toString().padStart(2, '0')}`;

  const lines: string[] = [
    `🎙️ ${title}`,
  ];
  if (speaker) lines.push(`👤 ${speaker}`);
  lines.push('');
  lines.push(`🕐 Clip from ${timestamp} (${Math.round(durationSec)}s)`);
  lines.push('');
  lines.push(`🔗 Listen free on Arewa Central:`);
  lines.push(appUrl);
  lines.push('');
  lines.push('Free Islamic Podcasts, Duas & more.');
  lines.push('No Ads. No Tracking. Your Daily Muslim Companion.');

  return lines.join('\n');
}
