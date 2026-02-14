import { useState, useCallback } from 'react';
import { saveDownload, isDownloaded, deleteDownload, getDownload } from '../lib/db';
import type { Episode } from '../types';

export function useDownloads() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const downloadEpisode = useCallback(async (episode: Episode): Promise<boolean> => {
    if (!episode.audioUrl) return false;
    
    const alreadyDownloaded = await isDownloaded(episode.$id);
    if (alreadyDownloaded) return true;
    
    setDownloading(episode.$id);
    setProgress(0);
    
    try {
      const response = await fetch(episode.audioUrl);
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (!response.body) {
        throw new Error('No response body');
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
      
      const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      const localBlobUrl = URL.createObjectURL(blob);
      
      await saveDownload({
        episodeId: episode.$id,
        title: episode.title,
        seriesId: episode.seriesId,
        audioUrl: episode.audioUrl,
        localBlobUrl,
        duration: episode.duration,
        downloadedAt: new Date(),
        fileSize: blob.size
      });
      
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