import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Search, Play, Clock, User } from 'lucide-react';
import { getFeaturedSpeakers, getLatestEpisodes, getFeaturedSeries, isAppwriteConfigured } from '../lib/appwrite';
import type { Speaker, Episode, Series, CurrentTrack } from '../types';
import { formatDuration, formatDate, cn } from '../lib/utils';
import { useAudio } from '../context/AudioContext';

export function Podcasts() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<Episode[]>([]);
  const [featuredSeries, setFeaturedSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
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
          getFeaturedSeries(5)
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

  const handlePlayEpisode = (episode: Episode) => {
    const track: CurrentTrack = {
      id: episode.$id,
      title: episode.title,
      audioUrl: episode.audioUrl,
      duration: episode.duration,
      type: 'episode'
    };
    play(track);
  };

  const isPlaying = (episodeId: string) => {
    return currentTrack?.id === episodeId && playerState === 'playing';
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-slate-800 rounded" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-24">
                <div className="w-24 h-24 rounded-full bg-slate-800" />
                <div className="h-4 w-20 mt-2 bg-slate-800 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-8">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-100">Muslim Central</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search episodes, speakers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
          />
        </div>
      </header>

      {!isAppwriteConfigured() && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-400">
            Appwrite is not configured. Create a .env file with your Appwrite credentials.
          </p>
        </div>
      )}

      {speakers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Featured Speakers</h2>
            <Link to="/podcasts/speakers" className="text-sm text-primary flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {speakers.map((speaker) => (
              <Link
                key={speaker.$id}
                to={`/podcasts/speaker/${speaker.slug}`}
                className="flex-shrink-0 text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                >
                  <img
                    src={speaker.imageUrl}
                    alt={speaker.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <p className="mt-2 text-xs text-slate-300 font-medium truncate w-20">
                  {speaker.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredSeries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Featured Series</h2>
            <Link to="/podcasts/series" className="text-sm text-primary flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {featuredSeries.map((series) => (
              <Link
                key={series.$id}
                to={`/podcasts/series/${series.$id}`}
                className="glass-card rounded-xl overflow-hidden"
              >
                <div className="aspect-square relative">
                  <img
                    src={series.artworkUrl}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-sm font-medium text-slate-100 truncate">{series.title}</p>
                    <p className="text-xs text-slate-400">{series.episodeCount} episodes</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {latestEpisodes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Latest Episodes</h2>
            <Link to="/podcasts/latest" className="text-sm text-primary flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="space-y-3">
            {latestEpisodes.slice(0, 5).map((episode) => (
              <motion.div
                key={episode.$id}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "glass-card rounded-xl p-3 flex items-center gap-3",
                  isPlaying(episode.$id) && "border-primary/30"
                )}
              >
                <button
                  onClick={() => handlePlayEpisode(episode)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    isPlaying(episode.$id)
                      ? "bg-primary text-slate-900 animate-pulse-gold"
                      : "bg-slate-800 text-slate-300 hover:bg-primary hover:text-slate-900"
                  )}
                >
                  <Play size={16} className={isPlaying(episode.$id) ? "" : "ml-0.5"} />
                </button>
                
                <div className="flex-1 min-w-0">
                  <Link to={`/podcasts/episode/${episode.$id}`}>
                    <p className="text-sm font-medium text-slate-100 truncate hover:text-primary transition-colors">
                      {episode.title}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>{formatDuration(episode.duration)}</span>
                    <span>•</span>
                    <span>{formatDate(episode.publishedAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {speakers.length === 0 && latestEpisodes.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400">No content available yet.</p>
          <p className="text-sm text-slate-500 mt-1">
            Add speakers and episodes in Appwrite to see them here.
          </p>
        </div>
      )}
    </div>
  );
}