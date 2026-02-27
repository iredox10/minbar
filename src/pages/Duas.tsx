import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Play, Search, Heart, Sparkles } from 'lucide-react';
import { getAllDuas, isAppwriteConfigured } from '../lib/appwrite';
import { trackDuaView } from '../lib/analytics';
import type { Dua, DuaCategory, CurrentTrack } from '../types';
import { useAudio } from '../context/AudioContext';
import { cn } from '../lib/utils';

const CATEGORIES: { id: DuaCategory; label: string; icon: string; gradient: string }[] = [
  { id: 'prophetic', label: 'Prophetic', icon: '📖', gradient: 'from-amber-500/20 to-orange-500/20' },
  { id: 'quranic', label: 'Quranic', icon: '📿', gradient: 'from-emerald-500/20 to-teal-500/20' },
  { id: 'morning', label: 'Morning', icon: '🌅', gradient: 'from-yellow-500/20 to-amber-500/20' },
  { id: 'evening', label: 'Evening', icon: '🌙', gradient: 'from-indigo-500/20 to-purple-500/20' },
  { id: 'sleep', label: 'Sleep', icon: '💫', gradient: 'from-violet-500/20 to-purple-500/20' },
  { id: 'travel', label: 'Travel', icon: '✈️', gradient: 'from-sky-500/20 to-blue-500/20' },
  { id: 'eating', label: 'Eating', icon: '🍽️', gradient: 'from-rose-500/20 to-pink-500/20' },
  { id: 'general', label: 'General', icon: '🤲', gradient: 'from-slate-500/20 to-gray-500/20' }
];

export function Duas() {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [filteredDuas, setFilteredDuas] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<DuaCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDua, setExpandedDua] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const { play, currentTrack, playerState } = useAudio();

  useEffect(() => {
    async function loadDuas() {
      if (!isAppwriteConfigured()) {
        setLoading(false);
        return;
      }
      
      try {
        const data = await getAllDuas();
        setDuas(data);
        setFilteredDuas(data);
      } catch (error) {
        console.error('Failed to load duas:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadDuas();
  }, []);

  useEffect(() => {
    let result = duas;
    
    if (selectedCategory) {
      result = result.filter(d => d.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.arabic.includes(query) ||
        d.translation.toLowerCase().includes(query)
      );
    }
    
    setFilteredDuas(result);
  }, [duas, selectedCategory, searchQuery]);

  const handlePlayDua = (dua: Dua) => {
    if (!dua.audioUrl) return;
    
    const track: CurrentTrack = {
      id: dua.$id,
      title: dua.title,
      audioUrl: dua.audioUrl,
      duration: 0,
      type: 'dua'
    };
    play(track);
  };

  const isPlaying = (duaId: string) => currentTrack?.id === duaId && playerState === 'playing';

  const toggleFavorite = (duaId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(duaId)) {
      newFavorites.delete(duaId);
    } else {
      newFavorites.add(duaId);
    }
    setFavorites(newFavorites);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern opacity-50" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative px-4 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 mb-4">
              <BookOpen className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">
              Dua Collection
            </h1>
            <p className="text-slate-400">Prophetic & Quranic supplications</p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative max-w-lg mx-auto mb-4"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search duas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
            />
          </motion.div>

          {/* Category Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"
          >
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                !selectedCategory
                  ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              )}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                  selectedCategory === cat.id
                    ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                    : `bg-gradient-to-r ${cat.gradient} text-slate-300 hover:bg-slate-700`
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 w-32 skeleton rounded" />
                  <div className="h-8 w-full skeleton rounded" />
                  <div className="h-3 w-48 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredDuas.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-slate-800/50 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-slate-400 text-lg">No duas found</p>
                {duas.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">Add duas in Appwrite</p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`${selectedCategory ?? 'all'}-${searchQuery}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {filteredDuas.map((dua, index) => (
                  <motion.div
                    key={dua.$id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.25) }}
                    layout
                    className={cn(
                  "glass-card rounded-2xl overflow-hidden transition-all",
                  isPlaying(dua.$id) && "border-primary/50",
                  expandedDua === dua.$id && "ring-2 ring-primary/30"
                )}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {CATEGORIES.find(c => c.id === dua.category)?.icon}
                        </span>
                        <h3 className="font-semibold text-slate-100">{dua.title}</h3>
                      </div>
                      <span className="text-xs text-slate-500 uppercase tracking-wide">
                        {dua.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {dua.audioUrl && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePlayDua(dua)}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            isPlaying(dua.$id)
                              ? "bg-primary text-slate-900"
                              : "bg-slate-800 text-slate-300 hover:bg-primary hover:text-slate-900"
                          )}
                        >
                          <Play size={16} className={isPlaying(dua.$id) ? "" : "ml-0.5"} />
                        </motion.button>
                      )}
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleFavorite(dua.$id)}
                        className={cn(
                          "p-2.5 rounded-xl transition-colors",
                          favorites.has(dua.$id)
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <Heart size={16} fill={favorites.has(dua.$id) ? 'currentColor' : 'none'} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Arabic Text */}
                  <motion.div
                    className="relative overflow-hidden"
                    animate={{ maxHeight: expandedDua === dua.$id ? 'none' : '120px' }}
                  >
                    <p 
                      className="text-2xl text-primary text-right leading-loose font-arabic mb-4"
                      dir="rtl"
                    >
                      {dua.arabic}
                    </p>
                    
                    {/* Gradient fade for collapsed state */}
                    <AnimatePresence>
                      {expandedDua !== dua.$id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Translation (show when expanded) */}
                  <AnimatePresence>
                    {expandedDua === dua.$id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {dua.transliteration && (
                          <p className="text-sm text-slate-400 italic mb-2">
                            {dua.transliteration}
                          </p>
                        )}
                        <p className="text-sm text-slate-300 mb-3">
                          {dua.translation}
                        </p>
                        <div className="p-3 bg-slate-800/50 rounded-xl">
                          <p className="text-xs text-primary font-medium">
                            📚 {dua.reference}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expand Toggle */}
                  <button
                    onClick={() => {
                      if (expandedDua !== dua.$id) {
                        trackDuaView(dua.$id, dua.title);
                      }
                      setExpandedDua(expandedDua === dua.$id ? null : dua.$id);
                    }}
                    className="mt-3 text-xs text-primary hover:text-primary-light transition-colors"
                  >
                    {expandedDua === dua.$id ? 'Show less' : 'Read translation'}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}