import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Search } from 'lucide-react';
import { getAllDuas, isAppwriteConfigured } from '../lib/appwrite';
import type { Dua, DuaCategory } from '../types';
import { useAudio } from '../context/AudioContext';
import type { CurrentTrack } from '../types';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const CATEGORIES: { id: DuaCategory; label: string; icon: string }[] = [
  { id: 'prophetic', label: 'Prophetic Duas', icon: '📖' },
  { id: 'quranic', label: 'Quranic Duas', icon: '📿' },
  { id: 'morning', label: 'Morning', icon: '🌅' },
  { id: 'evening', label: 'Evening', icon: '🌙' },
  { id: 'sleep', label: 'Before Sleep', icon: '💤' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'eating', label: 'Eating', icon: '🍽️' },
  { id: 'general', label: 'General', icon: '🤲' }
];

export function Duas() {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [filteredDuas, setFilteredDuas] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<DuaCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const isPlaying = (duaId: string) => {
    return currentTrack?.id === duaId && playerState === 'playing';
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-100">Dua Collection</h1>
        <p className="text-sm text-slate-400">Prophetic and Quranic supplications</p>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search duas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
          />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            !selectedCategory
              ? "bg-primary text-slate-900"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
              selectedCategory === cat.id
                ? "bg-primary text-slate-900"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-4">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-6 w-full bg-slate-800 rounded" />
                <div className="h-3 w-48 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDuas.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400">No duas found.</p>
          {duas.length === 0 && (
            <p className="text-sm text-slate-500 mt-1">
              Add duas in Appwrite to see them here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDuas.map((dua) => (
            <Link
              key={dua.$id}
              to={`/duas/${dua.$id}`}
            >
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "glass-card rounded-xl p-4 transition-all",
                  isPlaying(dua.$id) && "border-primary/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-100">{dua.title}</h3>
                    <p className="text-lg text-primary/80 font-arabic mt-2 leading-relaxed" dir="rtl">
                      {dua.arabic}
                    </p>
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                      {dua.translation}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {dua.reference}
                    </p>
                  </div>
                  
                  {dua.audioUrl && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handlePlayDua(dua);
                      }}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                        isPlaying(dua.$id)
                          ? "bg-primary text-slate-900"
                          : "bg-slate-800 text-slate-300 hover:bg-primary hover:text-slate-900"
                      )}
                    >
                      <Play size={16} className={isPlaying(dua.$id) ? "" : "ml-0.5"} />
                    </button>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}