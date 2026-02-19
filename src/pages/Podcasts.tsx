import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Search, Play, Clock, User, Sparkles, TrendingUp } from 'lucide-react';
import { getFeaturedSpeakers, getLatestEpisodes, getFeaturedSeries, isAppwriteConfigured } from '../lib/appwrite';
import type { Speaker, Episode, Series, CurrentTrack } from '../types';
import { formatDuration, formatDate, cn } from '../lib/utils';
import { useAudio } from '../context/AudioContext';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Podcasts() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<Episode[]>([]);
  const [featuredSeries, setFeaturedSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { play, currentTrack, playerState } = useAudio();

  useEffect(() => {
    async function loadData() {
      if (!isAppwriteConfigured()) {
        setLoading(false);
        return;
      }
      
      try {
        const [speakersData, episodesData, seriesData] = await Promise.all([
          getFeaturedSpeakers(10),
          getLatestEpisodes(10),
          getFeaturedSeries(6)
        ]);
        setSpeakers(speakersData);
        setLatestEpisodes(episodesData);
        setFeaturedSeries(seriesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handlePlayEpisode = (episode: Episode, series?: Series) => {
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
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        
        <div className="relative px-4 pt-8 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm text-primary font-medium">Free. No Ads. Your Daily Companion.</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-slate-100">Muslim</span>{' '}
              <span className="text-gradient">Central</span>
            </h1>
            <p className="text-slate-400 text-lg">Discover knowledge, inspiration & guidance</p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative max-w-lg mx-auto"
          >
            <Link 
              to="/search"
              className="flex items-center w-full pl-12 pr-4 py-4 bg-slate-900/80 border border-slate-700/50 rounded-2xl text-slate-500"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <span>Search episodes, speakers, topics...</span>
            </Link>
          </motion.div>
        </div>
      </div>

      {!isAppwriteConfigured() && (
        <div className="px-4 mb-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <p className="text-sm text-amber-400">
              Configure Appwrite credentials in .env to load content.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-4 space-y-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 bg-slate-800/50 rounded-lg" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-28">
                  <div className="w-28 h-28 rounded-full skeleton" />
                  <div className="h-4 w-20 mt-3 skeleton rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-10 pb-24">
          {/* Featured Speakers */}
          {speakers.length > 0 && (
            <motion.section
              variants={container}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xl font-bold text-slate-100">Featured Speakers</h2>
                </div>
                <Link to="/podcasts/speakers" className="text-sm text-primary flex items-center gap-1 hover:text-primary-light transition-colors">
                  View all <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {speakers.map((speaker, index) => (
                  <motion.div
                    key={speaker.$id}
                    variants={item}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to={`/podcasts/speaker/${speaker.slug}`}
                      className="flex flex-col items-center"
                    >
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-violet-500/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-slate-700 group-hover:ring-primary transition-all">
                          <img
                            src={speaker.imageUrl}
                            alt={speaker.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <TrendingUp size={12} className="text-slate-900" />
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-200 font-medium text-center w-24 truncate">
                        {speaker.name}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Featured Series */}
          {featuredSeries.length > 0 && (
            <motion.section
              variants={container}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-emerald-400 rounded-full" />
                  <h2 className="text-xl font-bold text-slate-100">Featured Series</h2>
                </div>
                <Link to="/podcasts/series" className="text-sm text-primary flex items-center gap-1 hover:text-primary-light transition-colors">
                  View all <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {featuredSeries.slice(0, 6).map((series, index) => (
                  <motion.div
                    key={series.$id}
                    variants={item}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to={`/podcasts/series/${series.$id}`}
                      className="block group"
                    >
                      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card geometric-border">
                        <img
                          src={series.artworkUrl}
                          alt={series.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="font-semibold text-slate-100 line-clamp-2 group-hover:text-primary transition-colors">
                            {series.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {series.episodeCount} episodes
                          </p>
                        </div>
                        {index === 0 && (
                          <div className="absolute top-3 left-3 px-2 py-1 bg-primary/90 rounded-lg text-xs font-medium text-slate-900">
                            Popular
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Latest Episodes */}
          {latestEpisodes.length > 0 && (
            <motion.section
              variants={container}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-rose-400 rounded-full" />
                  <h2 className="text-xl font-bold text-slate-100">Latest Episodes</h2>
                </div>
                <Link to="/podcasts/latest" className="text-sm text-primary flex items-center gap-1 hover:text-primary-light transition-colors">
                  View all <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="space-y-3">
                {latestEpisodes.slice(0, 5).map((episode) => (
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
                          "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all relative overflow-hidden",
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
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
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
                ))}
              </div>
            </motion.section>
          )}

          {/* Empty State */}
          {speakers.length === 0 && latestEpisodes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-slate-800/50 flex items-center justify-center">
                <User className="w-12 h-12 text-slate-600" />
              </div>
              <p className="text-slate-400 text-lg">No content available yet</p>
              <p className="text-sm text-slate-500 mt-2">
                Add speakers and episodes in Appwrite
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}