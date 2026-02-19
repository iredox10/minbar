import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Play, Clock, CheckCircle } from 'lucide-react';
import { getRecentHistory } from '../lib/db';
import { getEpisodeById, isAppwriteConfigured } from '../lib/appwrite';
import type { PlaybackHistory, Episode, CurrentTrack } from '../types';
import { useAudio } from '../context/AudioContext';
import { formatDuration, formatRelativeDate, cn } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface HistoryItem extends PlaybackHistory {
  episode?: Episode;
}

export function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { play, currentTrack, playerState } = useAudio();

  useEffect(() => {
    async function loadHistory() {
      try {
        const historyData = await getRecentHistory(50);

        if (isAppwriteConfigured()) {
          const historyWithEpisodes = await Promise.all(
            historyData.map(async (h) => {
              const episode = await getEpisodeById(h.episodeId);
              return { ...h, episode: episode || undefined };
            })
          );
          setHistory(historyWithEpisodes.filter(h => h.episode));
        } else {
          setHistory(historyData);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const handlePlayEpisode = (historyItem: HistoryItem) => {
    if (!historyItem.episode) return;
    
    const track: CurrentTrack = {
      id: historyItem.episode.$id,
      title: historyItem.episode.title,
      audioUrl: historyItem.episode.audioUrl,
      duration: historyItem.episode.duration,
      type: 'episode'
    };
    play(track, historyItem.position);
  };

  const isPlaying = (episodeId: string) => currentTrack?.id === episodeId && playerState === 'playing';

  const getProgressPercentage = (h: PlaybackHistory) => {
    if (h.duration === 0) return 0;
    return Math.min((h.position / h.duration) * 100, 100);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <HistoryIcon size={20} className="text-primary" />
            Playback History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resume where you left off
          </p>
        </div>
      </div>

      <div className="p-4 pb-24">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 bg-slate-800/30 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 skeleton rounded" />
                    <div className="h-3 w-1/2 skeleton rounded" />
                  </div>
                </div>
                <div className="h-1 mt-3 skeleton rounded-full" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <HistoryIcon className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">No playback history</p>
            <p className="text-sm text-slate-500 mt-2">
              Episodes you listen to will appear here
            </p>
            <Link 
              to="/"
              className="inline-block mt-4 px-6 py-3 bg-primary text-slate-900 font-medium rounded-xl"
            >
              Start Listening
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {history.map((h) => {
              if (!h.episode) return null;
              
              const progress = getProgressPercentage(h);
              const remainingTime = h.duration - h.position;

              return (
                <motion.div
                  key={h.id}
                  variants={item}
                  whileHover={{ x: 4 }}
                  className={cn(
                    "glass-card rounded-2xl p-4 group cursor-pointer",
                    isPlaying(h.episodeId) && "border-primary/50 bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handlePlayEpisode(h)}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all relative overflow-hidden",
                        isPlaying(h.episodeId)
                          ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                          : "bg-slate-800 text-slate-300 group-hover:bg-primary group-hover:text-slate-900"
                      )}
                    >
                      {h.completed ? (
                        <CheckCircle size={18} className="text-emerald-500" />
                      ) : (
                        <Play size={16} className="ml-0.5" />
                      )}
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <Link to={`/podcasts/episode/${h.episode.$id}`}>
                        <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">
                          {h.episode.title}
                        </p>
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDuration(h.duration)}
                        </span>
                        {!h.completed && remainingTime > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span>{formatDuration(remainingTime)} left</span>
                          </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>{formatRelativeDate(new Date(h.playedAt))}</span>
                      </div>

                      {!h.completed && progress > 0 && (
                        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}