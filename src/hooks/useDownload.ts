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

    setStatus('downloading');
    setProgress(0);
    setErrorMessage(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(audioUrl, {
        signal: abort.signal,
        mode: 'cors',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let received = 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abort.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        chunks.push(value);
        received += value.byteLength;
        if (total > 0) {
          setProgress(Math.min(99, Math.round((received / total) * 95)));
        }
      }

      // Assemble blob
      const mimeType = audioUrl.includes('.mp3') ? 'audio/mpeg' : 'audio/mpeg';
      const blob = new Blob(chunks, { type: mimeType });
      const localBlobUrl = URL.createObjectURL(blob);

      const record: Omit<DownloadedEpisode, 'id'> = {
        episodeId,
        title,
        seriesId,
        speakerId,
        audioUrl,
        localBlobUrl,
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
      if ((err as Error).name === 'AbortError') {
        setStatus('idle');
        setProgress(0);
        return;
      }
      console.error('[useDownload] failed:', err);
      setErrorMessage((err as Error).message ?? 'Download failed');
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  }, [episodeId, audioUrl, title, seriesId, speakerId, duration, status]);

  const removeDownload = useCallback(async () => {
    await deleteDownload(episodeId);
    setDownload(undefined);
    setProgress(0);
    setStatus('idle');
    setErrorMessage(null);
  }, [episodeId]);

  return { status, progress, download, startDownload, removeDownload, errorMessage };
}
