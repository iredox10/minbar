import { useState, useCallback } from 'react';
import { saveDownload, isDownloaded, deleteDownload, getDownload } from '../lib/db';
import type { Episode } from '../types';

async function downloadToDevice(blob: Blob, filename: string): Promise<boolean> {
  try {
    const url = URL.createObjectURL(blob);
    
    if (navigator.share) {
      const file = new File([blob], filename, { type: blob.type || 'audio/mpeg' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename
          });
          URL.revokeObjectURL(url);
          return true;
        }
      } catch {
        // Fall through to download link approach
      }
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('Failed to download to device:', error);
    return false;
  }
}

export function useDownloads() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const downloadEpisode = useCallback(async (episode: Episode): Promise<boolean> => {
    if (!episode.audioUrl) {
      return false;
    }
    
    setDownloading(episode.$id);
    setProgress(0);
    
    try {
      const response = await fetch(episode.audioUrl);
      
      if (!response.ok) {
        return false;
      }
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (!response.body) {
        return false;
      }
      
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        received += value.length;
        
        if (total > 0) {
          setProgress(Math.round((received / total) * 100));
        }
      }
      
      const extension = episode.audioUrl.split('.').pop()?.split('?')[0] || 'mp3';
      const mimeType = extension === 'mp3' ? 'audio/mpeg' : `audio/${extension}`;
      const blob = new Blob(chunks as BlobPart[], { type: mimeType });
      const filename = `${episode.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      
      const localBlobUrl = URL.createObjectURL(blob);
      
      await saveDownload({
        episodeId: episode.$id,
        title: episode.title,
        seriesId: episode.seriesId,
        speakerId: episode.speakerId,
        audioUrl: episode.audioUrl,
        localBlobUrl,
        duration: episode.duration,
        downloadedAt: new Date(),
        fileSize: blob.size
      });
      
      await downloadToDevice(blob, filename);
      
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      return false;
    } finally {
      setDownloading(null);
      setProgress(0);
    }
  }, []);

  const removeDownload = useCallback(async (episodeId: string): Promise<void> => {
    await deleteDownload(episodeId);
  }, []);

  const checkDownloaded = useCallback(async (episodeId: string): Promise<boolean> => {
    return isDownloaded(episodeId);
  }, []);

  const getLocalUrl = useCallback(async (episodeId: string): Promise<string | null> => {
    const download = await getDownload(episodeId);
    return download?.localBlobUrl || null;
  }, []);

  return {
    downloading,
    progress,
    downloadEpisode,
    removeDownload,
    checkDownloaded,
    getLocalUrl
  };
}