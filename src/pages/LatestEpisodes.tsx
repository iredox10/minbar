import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Clock, ArrowLeft, Play, ChevronRight } from 'lucide-react';
import { getLatestEpisodes, getSeriesById, isAppwriteConfigured } from '../lib/appwrite';
import type { Episode, Series, CurrentTrack } from '../types';
import { formatDuration, formatDate, cn } from '../lib/utils';
import { useAudio } from '../context/AudioContext';

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

export function LatestEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [seriesMap, setSeriesMap] = useState<Record<string, Series>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { play, currentTrack, playerState } = useAudio();

  useEffect(() => {
    async function loadEpisodes() {
      if (!isAppwriteConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const data = await getLatestEpisodes(100);
        setEpisodes(data);
        setFilteredEpisodes(data);
        
        const seriesIds = [...new Set(data.map(e => e.seriesId).filter(Boolean))];
        const seriesData: Record<string, Series> = {};
        
        for (const id of seriesIds) {
          const series = await getSeriesById(id!);
          if (series) {
            seriesData[id!] = series;
          }
        }
        setSeriesMap(seriesData);
      } catch (error) {
        console.error('Failed to load episodes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEpisodes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEpisodes(episodes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEpisodes(
        episodes.filter(e => 
          e.title.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, episodes]);

  const handlePlayEpisode = (episode: Episode) => {
    const series = episode.seriesId ? seriesMap[episode.seriesId] : undefined;
    const track: CurrentTrack = {
      id: episode.$id,
      title: episode.title,
      audioUrl: episode.audioUrl,
      artworkUrl: series?.artworkUrl,
      speaker: series?.title,
      duration: episode.duration,
      type: 'episode'
    };
    play(track);
  };

  const isPlaying = (episodeId: string) => currentTrack?.id === episodeId && playerState === 'playing';

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-slate-100">Latest Episodes</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 pb-24">
          {filteredEpisodes.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {filteredEpisodes.map((episode) => {
                const series = episode.seriesId ? seriesMap[episode.seriesId] : undefined;
                
                return (
                  <motion.div
                    key={episode.$id}
                    variants={item}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "glass-card rounded-2xl p-4 group cursor-pointer",
                      isPlaying(episode.$id) && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handlePlayEpisode(episode)}
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all",
                          isPlaying(episode.$id)
                            ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                            : "bg-slate-800 text-slate-300 group-hover:bg-primary group-hover:text-slate-900"
                        )}
                      >
                        {isPlaying(episode.$id) ? (
                          <div className="flex items-end gap-0.5 h-5">
                            {[0, 1, 2].map(i => (
                              <span
                                key={i}
                                className="w-1 bg-slate-900 rounded-full audio-wave-bar"
                                style={{ animationDelay: `${i * 150}ms` }}
                              />
                            ))}
                          </div>
                        ) : (
                          <Play size={20} className="ml-0.5" />
                        )}
                      </motion.button>
                      
                      <div className="flex-1 min-w-0">
                        <Link to={`/podcasts/episode/${episode.$id}`}>
                          <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">
                            {episode.title}
                          </p>
                        </Link>
                        {series && (
                          <Link 
                            to={`/podcasts/series/${series.$id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {series.title}
                          </Link>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} />
                            {formatDuration(episode.duration)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          <span>{formatDate(episode.publishedAt)}</span>
                        </div>
                      </div>
                      
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                <Clock className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400">No episodes found</p>
              {searchQuery && (
                <p className="text-sm text-slate-500 mt-2">
                  Try a different search term
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}