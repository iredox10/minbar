import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Trash2, Play, Clock, HardDrive } from 'lucide-react';
import { getAllDownloads, deleteDownload } from '../lib/db';
import { useAudio } from '../context/AudioContext';
import type { DownloadedEpisode, CurrentTrack } from '../types';
import { formatDuration, formatFileSize, formatRelativeDate, cn } from '../lib/utils';
import { motion } from 'framer-motion';

export function Downloads() {
  const downloads = useLiveQuery(() => getAllDownloads(), []);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const { play, currentTrack, playerState } = useAudio();

  const handlePlay = (episode: DownloadedEpisode) => {
    const track: CurrentTrack = {
      id: episode.episodeId,
      title: episode.title,
      audioUrl: episode.localBlobUrl,
      duration: episode.duration,
      type: 'episode'
    };
    play(track);
  };

  const handleDelete = async (episodeId: string) => {
    setDeleting(episodeId);
    try {
      await deleteDownload(episodeId);
    } catch (error) {
      console.error('Failed to delete download:', error);
    } finally {
      setDeleting(null);
    }
  };

  const isPlaying = (episodeId: string) => {
    return currentTrack?.id === episodeId && playerState === 'playing';
  };

  const totalSize = downloads?.reduce((acc, d) => acc + d.fileSize, 0) || 0;

  return (
    <div className="px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Downloads</h1>
        <p className="text-sm text-slate-400 mt-1">
          {downloads?.length || 0} episodes • {formatFileSize(totalSize)} used
        </p>
      </header>

      {!downloads || downloads.length === 0 ? (
        <div className="text-center py-12">
          <Download className="w-16 h-16 mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400">No downloaded episodes.</p>
          <p className="text-sm text-slate-500 mt-1">
            Download episodes to listen offline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((episode) => (
            <motion.div
              key={episode.episodeId}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "glass-card rounded-xl p-4",
                isPlaying(episode.episodeId) && "border-primary/30"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handlePlay(episode)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    isPlaying(episode.episodeId)
                      ? "bg-primary text-slate-900"
                      : "bg-slate-800 text-slate-300 hover:bg-primary hover:text-slate-900"
                  )}
                >
                  <Play size={16} className={isPlaying(episode.episodeId) ? "" : "ml-0.5"} />
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-100 truncate">
                    {episode.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDuration(episode.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive size={12} />
                      {formatFileSize(episode.fileSize)}
                    </span>
                    <span>{formatRelativeDate(new Date(episode.downloadedAt))}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDelete(episode.episodeId)}
                  disabled={deleting === episode.episodeId}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deleting === episode.episodeId ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}