import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio as RadioIcon, Play, Pause, Volume2, VolumeX, Signal, Heart } from 'lucide-react';
import { getRadioStations, isAppwriteConfigured } from '../lib/appwrite';
import type { RadioStation, CurrentTrack } from '../types';
import { useAudio } from '../context/AudioContext';
import { cn } from '../lib/utils';

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

export function Radio() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  
  const { play, pause, currentTrack, playerState, toggleMute, isMuted, volume, setVolume } = useAudio();

  useEffect(() => {
    async function loadStations() {
      if (!isAppwriteConfigured()) {
        setLoading(false);
        return;
      }
      
      try {
        const data = await getRadioStations();
        setStations(data);
      } catch (error) {
        console.error('Failed to load radio stations:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadStations();
  }, []);

  const handlePlayStation = (station: RadioStation) => {
    if (currentTrack?.id === station.$id && playerState === 'playing') {
      pause();
      return;
    }
    
    const track: CurrentTrack = {
      id: station.$id,
      title: station.name,
      audioUrl: station.streamUrl,
      duration: 0,
      type: 'radio'
    };
    play(track);
  };

  const isPlaying = (stationId: string) => currentTrack?.id === stationId && playerState === 'playing';

  const toggleLike = (stationId: string) => {
    const newLiked = new Set(liked);
    if (newLiked.has(stationId)) {
      newLiked.delete(stationId);
    } else {
      newLiked.add(stationId);
    }
    setLiked(newLiked);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative px-4 pt-8 pb-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/30 mb-4"
          >
            <RadioIcon className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Live Radio</h1>
          <p className="text-slate-400">Stream Islamic content 24/7</p>
          
          {currentTrack && playerState === 'playing' && currentTrack.type === 'radio' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm text-emerald-400 font-medium">Now Streaming: {currentTrack.title}</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="px-4 pb-24">
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 skeleton rounded" />
                    <div className="h-3 w-48 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : stations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-slate-800/50 flex items-center justify-center">
              <Signal className="w-12 h-12 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">No stations available</p>
            <p className="text-sm text-slate-500 mt-2">Add radio stations in Appwrite</p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4"
          >
            {stations.map((station) => (
              <motion.div
                key={station.$id}
                variants={item}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "glass-card rounded-2xl overflow-hidden transition-all",
                  isPlaying(station.$id) && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="relative flex-shrink-0">
                      {station.logoUrl ? (
                        <img
                          src={station.logoUrl}
                          alt={station.name}
                          className="w-16 h-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <RadioIcon className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      
                      {/* Live indicator */}
                      {station.isLive && (
                        <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white shadow-lg">
                          LIVE
                        </div>
                      )}
                      
                      {/* Playing animation */}
                      <AnimatePresence>
                        {isPlaying(station.$id) && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center"
                          >
                            <div className="flex items-end gap-0.5 h-6">
                              {[0, 1, 2, 3].map(i => (
                                <motion.span
                                  key={i}
                                  className="w-1 bg-primary rounded-full"
                                  animate={{
                                    height: ['30%', '100%', '30%']
                                  }}
                                  transition={{
                                    duration: 0.5,
                                    repeat: Infinity,
                                    delay: i * 0.1
                                  }}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">{station.name}</h3>
                      {station.description && (
                        <p className="text-sm text-slate-400 truncate mt-0.5">{station.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400">
                          {station.isLive ? 'Live Stream' : 'Recorded'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleLike(station.$id)}
                        className={cn(
                          "p-2.5 rounded-xl transition-colors",
                          liked.has(station.$id)
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <Heart size={18} fill={liked.has(station.$id) ? 'currentColor' : 'none'} />
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePlayStation(station)}
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative overflow-hidden",
                          isPlaying(station.$id)
                            ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                            : "bg-gradient-to-br from-primary to-primary-dark text-slate-900 hover:shadow-lg hover:shadow-primary/20"
                        )}
                      >
                        {isPlaying(station.$id) ? (
                          <Pause size={22} />
                        ) : (
                          <Play size={22} className="ml-0.5" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Volume Control (when playing) */}
        <AnimatePresence>
          {currentTrack?.type === 'radio' && playerState === 'playing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-32 left-4 right-4 glass-card-dark rounded-2xl p-4 border border-primary/20"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      if (newVolume > 0 && isMuted) toggleMute();
                    }}
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-primary
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-primary/30"
                  />
                </div>
                
                <span className="text-sm text-slate-400 font-mono w-12 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}