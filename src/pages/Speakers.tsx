import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, User, TrendingUp, ArrowLeft } from 'lucide-react';
import { getAllSpeakers, isAppwriteConfigured } from '../lib/appwrite';
import type { Speaker } from '../types';


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

export function Speakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [filteredSpeakers, setFilteredSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadSpeakers() {
      if (!isAppwriteConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const data = await getAllSpeakers();
        setSpeakers(data);
        setFilteredSpeakers(data);
      } catch (error) {
        console.error('Failed to load speakers:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSpeakers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSpeakers(speakers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSpeakers(
        speakers.filter(s => 
          s.name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, speakers]);

  const featuredSpeakers = filteredSpeakers.filter(s => s.featured);
  const otherSpeakers = filteredSpeakers.filter(s => !s.featured);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-slate-100">All Speakers</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search speakers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 animate-pulse space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl">
              <div className="w-16 h-16 rounded-full skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-3 w-48 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-8 pb-24">
          {featuredSpeakers.length > 0 && (
            <motion.section
              variants={container}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-lg font-semibold text-slate-100">Featured</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredSpeakers.map((speaker, index) => (
                  <motion.div
                    key={speaker.$id}
                    variants={item}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to={`/podcasts/speaker/${speaker.slug}`}
                      className="block group"
                    >
                      <div className="glass-card rounded-2xl p-4 text-center">
                        <div className="relative mx-auto w-20 h-20 mb-3">
                          <img
                            src={speaker.imageUrl}
                            alt={speaker.name}
                            className="w-full h-full rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-primary transition-all"
                          />
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <TrendingUp size={10} className="text-slate-900" />
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-slate-100 group-hover:text-primary transition-colors truncate">
                          {speaker.name}
                        </p>
                        {speaker.bio && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {speaker.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {otherSpeakers.length > 0 && (
            <motion.section
              variants={container}
              initial="hidden"
              animate="show"
            >
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                {featuredSpeakers.length > 0 ? 'All Speakers' : 'Speakers'}
              </h2>
              
              <div className="space-y-3">
                {otherSpeakers.map((speaker) => (
                  <motion.div
                    key={speaker.$id}
                    variants={item}
                    whileHover={{ x: 4 }}
                  >
                    <Link
                      to={`/podcasts/speaker/${speaker.slug}`}
                      className="flex items-center gap-4 p-4 glass-card rounded-2xl group"
                    >
                      <img
                        src={speaker.imageUrl}
                        alt={speaker.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-primary transition-all"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-100 group-hover:text-primary transition-colors">
                          {speaker.name}
                        </p>
                        {speaker.bio && (
                          <p className="text-sm text-slate-500 truncate">
                            {speaker.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {filteredSpeakers.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                <User className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400">No speakers found</p>
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