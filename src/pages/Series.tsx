import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, ArrowLeft, Play } from 'lucide-react';
import { getAllSeries, isAppwriteConfigured } from '../lib/appwrite';
import type { Series } from '../types';
import { cn } from '../lib/utils';

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

export function Series() {
  const [series, setSeries] = useState<Series[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadSeries() {
      if (!isAppwriteConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const data = await getAllSeries();
        setSeries(data);
        setFilteredSeries(data);
      } catch (error) {
        console.error('Failed to load series:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSeries(series);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSeries(
        series.filter(s => 
          s.title.toLowerCase().includes(query) ||
          s.category?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, series]);

  const categories = [...new Set(series.map(s => s.category).filter(Boolean))];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-slate-100">All Series</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
          
          {categories.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
                  searchQuery === '' ? "bg-primary text-slate-900" : "bg-slate-800/50 text-slate-300"
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(cat || '')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
                    searchQuery.toLowerCase() === cat?.toLowerCase() ? "bg-primary text-slate-900" : "bg-slate-800/50 text-slate-300"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-4 animate-pulse grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square rounded-2xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="p-4 pb-24">
          {filteredSeries.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {filteredSeries.map((s, index) => (
                <motion.div
                  key={s.$id}
                  variants={item}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={`/podcasts/series/${s.$id}`}
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
                        <p className="font-semibold text-slate-100 text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {s.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <Play size={10} />
                          <span>{s.episodeCount} episodes</span>
                        </div>
                      </div>
                      {index === 0 && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary/90 rounded text-xs font-medium text-slate-900">
                          Popular
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400">No series found</p>
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