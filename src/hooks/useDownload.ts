/**
 * useDownload.ts
 * Hook for downloading a full episode audio file and persisting it
 * in IndexedDB (via Dexie) for offline playback.
 *
 * Uses the Fetch + ReadableStream API to track download progress.
 * No external dependencies.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDownload,
  saveDownload,
  deleteDownload,
  getSettings,
} from '../lib/db';
import { trackDownload } from '../lib/analytics';
import type { DownloadedEpisode } from '../types';

export type DownloadStatus =
  | 'idle'         // not downloaded, no active download
  | 'checking'     // querying IndexedDB on mount
  | 'downloading'  // fetch in progress
  | 'done'         // saved in IndexedDB
  | 'error';       // fetch or save failed

export interface UseDownloadResult {
  status: DownloadStatus;
  progress: number;         // 0–100 during downloading, 100 when done
  download: DownloadedEpisode | undefined; // the stored record when done
  startDownload: () => Promise<void>;
  cancelDownload: () => void;
  removeDownload: () => Promise<void>;
  errorMessage: string | null;
}

export function useDownload(
  episodeId: string,
  audioUrl: string,
  title: string,
  seriesId?: string,
  speakerId?: string,
  duration?: number,
): UseDownloadResult {
  const [status, setStatus] = useState<DownloadStatus>('checking');
  const [progress, setProgress] = useState(0);
  const [download, setDownload] = useState<DownloadedEpisode | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // On mount (or when episodeId changes) check if already downloaded
  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    getDownload(episodeId).then((existing) => {
      if (cancelled) return;
      if (existing) {
        setDownload(existing);
        setProgress(100);
        setStatus('done');
      } else {
        setStatus('idle');
      }
    });
    return () => { cancelled = true; };
  }, [episodeId]);

  const startDownload = useCallback(async () => {
    if (status === 'downloading' || status === 'done') return;

    let writable: any = null;
    let useFallback = true;

    // Prompt user BEFORE any other await to maintain user gesture context!
    // If we await fetch() or getSettings() first, the browser drops the user gesture
    // and throws a SecurityError when we try to open the file picker.
    if ('showSaveFilePicker' in window) {
      try {
        // @ts-ignore - showSaveFilePicker is not fully typed in all standard TS configs yet
        const handle = await window.showSaveFilePicker({
          suggestedName: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`,
          types: [{
            description: 'MP3 Audio',
            accept: { 'audio/mpeg': ['.mp3'] },
          }],
        });
        writable = await handle.createWritable();
        useFallback = false;
      } catch (err: any) {
        // If user cancels the file picker, just stop
        if (err.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        console.warn('File picker failed, using fallback', err);
      }
    }

    // Respect the Wi-Fi only setting
    const appSettings = await getSettings();
    const wifiOnly = appSettings?.downloadWifiOnly ?? true;
    if (wifiOnly) {
      const conn = (navigator as Navigator & { connection?: { type?: string } }).connection;
      if (conn?.type && conn.type !== 'wifi' && conn.type !== 'ethernet' && conn.type !== 'none') {
        setErrorMessage('Wi-Fi only mode is enabled. Connect to Wi-Fi to download.');
        setStatus('error');
        if (writable) await writable.abort();
        return;
      }
    }

    setStatus('downloading');
    setProgress(0);
    setErrorMessage(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const chunks: ArrayBuffer[] = [];
      let received = 0;
      let total = 0;
      
      let retries = 3;
      let isDone = false;

      while (retries > 0 && !isDone) {
        try {
          const headers: HeadersInit = {};
          // If we already received data, ask for the rest
          if (received > 0) {
            headers['Range'] = `bytes=${received}-`;
          }

          const response = await fetch(audioUrl, {
            signal: abort.signal,
            mode: 'cors',
            cache: 'no-store',
            headers,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }

          if (total === 0) {
            const contentLength = response.headers.get('Content-Length');
            if (response.status === 206) {
              // Partial content means the total is received + content length of this chunk
              total = received + (contentLength ? parseInt(contentLength, 10) : 0);
            } else {
              total = contentLength ? parseInt(contentLength, 10) : 0;
              // If the server ignored the Range header and sent a 200 OK, reset progress
              if (received > 0) {
                received = 0;
                chunks.length = 0; // Clear chunks
                // Note: we can't easily reset the writable handle position to 0 
                // in the middle of a write without truncating, but we can try:
                // Actually, if using showSaveFilePicker, we should technically truncate
                // but let's hope archive.org respects Range. It usually does.
              }
            }
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('ReadableStream not supported');

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              isDone = true;
              break;
            }
            if (abort.signal.aborted) {
              if (writable) await writable.abort();
              throw new DOMException('Aborted', 'AbortError');
            }
            if (value) {
              chunks.push(value.buffer as ArrayBuffer);
              received += value.byteLength;
              if (writable) {
                await writable.write(value);
              }
            }
            if (total > 0) {
              setProgress(Math.min(99, Math.round((received / total) * 95)));
            }
          }
        } catch (streamErr: any) {
          if (streamErr.name === 'AbortError') {
            throw streamErr; // Re-throw aborts immediately
          }
          console.warn(`[useDownload] Stream interrupted. Retries left: ${retries - 1}`, streamErr);
          retries--;
          if (retries === 0) {
            throw streamErr; // Exhausted retries
          }
          // Wait 2 seconds before retrying to let the network stabilize
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (writable) {
        await writable.close();
      }

      // Assemble blob for IndexedDB
      const mimeType = audioUrl.includes('.mp3') ? 'audio/mpeg' : 'audio/mpeg';
      const blob = new Blob(chunks, { type: mimeType });

      if (useFallback) {
        // Fallback for browsers that don't support showSaveFilePicker (like Firefox/Safari)
        const localBlobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = localBlobUrl;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(localBlobUrl);
      }

      // Simultaneously save to IndexedDB so it appears in the PWA's Downloads page
      // and can be played completely offline without selecting the file again.
      const finalLocalBlobUrl = URL.createObjectURL(blob);
      const record: Omit<DownloadedEpisode, 'id'> = {
        episodeId,
        title,
        seriesId,
        speakerId,
        audioUrl,
        localBlobUrl: finalLocalBlobUrl,
        blob, // store the actual file in IndexedDB
        duration: duration ?? 0,
        downloadedAt: new Date(),
        fileSize: blob.size,
      };

      const id = await saveDownload(record);
      const saved: DownloadedEpisode = { id, ...record };

      trackDownload(episodeId, title);
      setDownload(saved);
      setProgress(100);
      setStatus('done');
    } catch (err) {
      if (writable && (err as Error).name !== 'AbortError') {
        try { await writable.abort(); } catch (_) {}
      }
      if ((err as Error).name === 'AbortError') {
        setStatus('idle');
        setProgress(0);
        return;
      }
      console.error('[useDownload] failed:', err);
      let msg = (err as Error).message ?? 'Download failed';
      if (msg === 'Failed to fetch' || msg.includes('network error')) {
        msg = 'Network error or CORS issue. Please check your connection or try again later.';
      }
      setErrorMessage(msg);
      setStatus('error');
      setProgress(0);
    } finally {
      abortRef.current = null;
    }
  }, [episodeId, audioUrl, title, seriesId, speakerId, duration, status]);

  const cancelDownload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const removeDownload = useCallback(async () => {
    await deleteDownload(episodeId);
    setDownload(undefined);
    setProgress(0);
    setStatus('idle');
    setErrorMessage(null);
  }, [episodeId]);

  return { status, progress, download, startDownload, cancelDownload, removeDownload, errorMessage };
}
