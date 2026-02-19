import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, Clock, User, BookOpen, X, TrendingUp } from 'lucide-react';
import { searchEpisodes, getAllSpeakers, getFeaturedSeries, isAppwriteConfigured } from '../lib/appwrite';
import type { Episode, Speaker, Series, CurrentTrack } from '../types';
import { useAudio } from '../context/AudioContext';
import { formatDuration, formatDate, cn } from '../lib/utils';

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

type SearchTab = 'all' | 'episodes' | 'speakers' | 'series';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { play, currentTrack, playerState } = useAudio();

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    async function performSearch() {
      if (!query.trim() || !isAppwriteConfigured()) {
        setEpisodes([]);
        setSpeakers([]);
        setSeries([]);
        return;
      }

      setLoading(true);
      try {
        const [episodesData, speakersData, seriesData] = await Promise.all([
          searchEpisodes(query),
          getAllSpeakers(),
          getFeaturedSeries(20)
        ]);

        const lowerQuery = query.toLowerCase();
        const filteredSpeakers = speakersData.filter(s => 
          s.name.toLowerCase().includes(lowerQuery)
        );
        const filteredSeries = seriesData.filter(s => 
          s.title.toLowerCase().includes(lowerQuery) ||
          (s.description && s.description.toLowerCase().includes(lowerQuery))
        );

        setEpisodes(episodesData);
        setSpeakers(filteredSpeakers);
        setSeries(filteredSeries);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
    } else {
      setSearchParams({});
    }
  };

  const saveSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery);
    setSearchParams({ q: searchQuery });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handlePlayEpisode = (episode: Episode, seriesData?: Series) => {
    const track: CurrentTrack = {
      id: episode.$id,
      title: episode.title,
      audioUrl: episode.audioUrl,
      artworkUrl: seriesData?.artworkUrl,
      speaker: seriesData?.title,
      duration: episode.duration,
      type: 'episode'
    };
    play(track);
    saveSearch(query);
  };

  const isPlaying = (episodeId: string) => currentTrack?.id === episodeId && playerState === 'playing';

  const hasResults = episodes.length > 0 || speakers.length > 0 || series.length > 0;

  const filteredEpisodes = activeTab === 'all' || activeTab === 'episodes' ? episodes : [];
  const filteredSpeakers = activeTab === 'all' || activeTab === 'speakers' ? speakers : [];
  const filteredSeries = activeTab === 'all' || activeTab === 'series' ? series : [];

  const tabs: { id: SearchTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: episodes.length + speakers.length + series.length },
    { id: 'episodes', label: 'Episodes', count: episodes.length },
    { id: 'speakers', label: 'Speakers', count: speakers.length },
    { id: 'series', label: 'Series', count: series.length }
  ];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-slate-100 mb-4">Search</h1>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search episodes, speakers, series..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              className="w-full pl-12 pr-10 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
            />
            {query && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {hasResults && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-slate-900"
                    : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 pb-24">
        {!query.trim() && recentSearches.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-500" />
                <h2 className="text-sm font-medium text-slate-400">Recent Searches</h2>
              </div>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-slate-500 hover:text-primary transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => handleRecentClick(search)}
                  className="px-4 py-2 bg-slate-800/50 rounded-full text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
                >
                  {search}
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {loading ? (
          <div className="animate-pulse space-y-4 mt-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl">
                <div className="w-14 h-14 rounded-xl skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 skeleton rounded" />
                  <div className="h-3 w-1/2 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {query.trim() && !hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No results found</p>
                <p className="text-sm text-slate-500 mt-2">
                  Try different keywords or check spelling
                </p>
              </motion.div>
            )}

            {hasResults && (
              <motion.div
                key="results"
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-8"
              >
                {filteredSpeakers.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <User size={16} className="text-primary" />
                      <h2 className="text-sm font-semibold text-slate-100">Speakers</h2>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                      {filteredSpeakers.slice(0, 10).map((speaker) => (
                        <motion.div
                          key={speaker.$id}
                          variants={item}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Link
                            to={`/podcasts/speaker/${speaker.slug}`}
                            onClick={() => saveSearch(query)}
                            className="flex flex-col items-center"
                          >
                            <img
                              src={speaker.imageUrl}
                              alt={speaker.name}
                              className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-700"
                            />
                            <p className="mt-2 text-xs text-slate-300 text-center w-20 truncate">
                              {speaker.name}
                            </p>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {filteredSeries.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen size={16} className="text-emerald-400" />
                      <h2 className="text-sm font-semibold text-slate-100">Series</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredSeries.slice(0, 6).map((s) => (
                        <motion.div
                          key={s.$id}
                          variants={item}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Link
                            to={`/podcasts/series/${s.$id}`}
                            onClick={() => saveSearch(query)}
                            className="block group"
                          >
                            <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
                              <img
                                src={s.artworkUrl}
                                alt={s.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="font-medium text-sm text-slate-100 line-clamp-2 group-hover:text-primary transition-colors">
                                  {s.title}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {s.episodeCount} episodes
                                </p>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {filteredEpisodes.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Play size={16} className="text-rose-400" />
                      <h2 className="text-sm font-semibold text-slate-100">Episodes</h2>
                    </div>
                    
                    <div className="space-y-3">
                      {filteredEpisodes.slice(0, 10).map((episode) => (
                        <motion.div
                          key={episode.$id}
                          variants={item}
                          whileHover={{ x: 4 }}
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
                                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                                isPlaying(episode.$id)
                                  ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                                  : "bg-slate-800 text-slate-300 group-hover:bg-primary group-hover:text-slate-900"
                              )}
                            >
                              <Play size={16} className="ml-0.5" />
                            </motion.button>

                            <div className="flex-1 min-w-0">
                              <Link 
                                to={`/podcasts/episode/${episode.$id}`}
                                onClick={() => saveSearch(query)}
                              >
                                <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">
                                  {episode.title}
                                </p>
                              </Link>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatDuration(episode.duration)}
                                </span>
                                {episode.publishedAt && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span>{formatDate(episode.publishedAt)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}