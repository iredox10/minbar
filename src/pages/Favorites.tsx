import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, Trash2, Music2, BookOpen } from 'lucide-react';
import { getFavorites, removeFavorite } from '../lib/db';
import type { Favorite } from '../types';
import { formatRelativeDate, cn } from '../lib/utils';

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

type TabType = 'all' | 'episode' | 'series' | 'dua';

export function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    async function loadFavorites() {
      try {
        const data = await getFavorites();
        setFavorites(data);
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, []);

  const handleRemove = async (type: 'episode' | 'series' | 'dua', itemId: string) => {
    await removeFavorite(type, itemId);
    setFavorites(prev => prev.filter(f => !(f.type === type && f.itemId === itemId)));
  };

  const filteredFavorites = activeTab === 'all' 
    ? favorites 
    : favorites.filter(f => f.type === activeTab);

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: favorites.length },
    { id: 'episode', label: 'Episodes', count: favorites.filter(f => f.type === 'episode').length },
    { id: 'series', label: 'Series', count: favorites.filter(f => f.type === 'series').length },
    { id: 'dua', label: 'Duas', count: favorites.filter(f => f.type === 'dua').length }
  ];

  const getLink = (fav: Favorite) => {
    switch (fav.type) {
      case 'episode':
        return `/podcasts/episode/${fav.itemId}`;
      case 'series':
        return `/podcasts/series/${fav.itemId}`;
      case 'dua':
        return `/duas/${fav.itemId}`;
    }
  };

  const getTypeIcon = (type: 'episode' | 'series' | 'dua') => {
    switch (type) {
      case 'episode':
        return Play;
      case 'series':
        return Music2;
      case 'dua':
        return BookOpen;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Heart size={20} className="text-primary" />
            Favorites
          </h1>
        </div>

        {favorites.length > 0 && (
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
        {loading ? (
          <div className="animate-pulse space-y-4">
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
        ) : favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <Heart className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">No favorites yet</p>
            <p className="text-sm text-slate-500 mt-2">
              Tap the heart icon to save content
            </p>
            <Link 
              to="/"
              className="inline-block mt-4 px-6 py-3 bg-primary text-slate-900 font-medium rounded-xl"
            >
              Explore Content
            </Link>
          </motion.div>
        ) : filteredFavorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <p className="text-slate-400">No {activeTab === 'all' ? '' : activeTab + 's'} in favorites</p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <AnimatePresence>
              {filteredFavorites.map((fav) => {
                const TypeIcon = getTypeIcon(fav.type);
                
                return (
                  <motion.div
                    key={`${fav.type}-${fav.itemId}`}
                    variants={item}
                    exit={{ opacity: 0, x: -100 }}
                    layout
                  >
                    <div className="glass-card rounded-2xl p-4 group">
                      <div className="flex items-center gap-4">
                        <Link 
                          to={getLink(fav)}
                          className="flex items-center gap-4 flex-1 min-w-0"
                        >
                          <div className="relative flex-shrink-0">
                            {fav.imageUrl ? (
                              <img
                                src={fav.imageUrl}
                                alt={fav.title}
                                className="w-14 h-14 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                                <TypeIcon className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                              <TypeIcon size={10} className="text-slate-400" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">
                              {fav.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span className="capitalize">{fav.type}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-600" />
                              <span>{formatRelativeDate(new Date(fav.addedAt))}</span>
                            </div>
                          </div>
                        </Link>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemove(fav.type, fav.itemId)}
                          className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}