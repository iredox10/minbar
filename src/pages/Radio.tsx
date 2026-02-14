import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio as RadioIcon, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getRadioStations, isAppwriteConfigured } from '../lib/appwrite';
import type { RadioStation, CurrentTrack } from '../types';
import { useAudio } from '../context/AudioContext';
import { cn } from '../lib/utils';

export function Radio() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  
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
    
    setSelectedStation(station);
    const track: CurrentTrack = {
      id: station.$id,
      title: station.name,
      audioUrl: station.streamUrl,
      duration: 0,
      type: 'radio'
    };
    play(track);
  };

  const isPlaying = (stationId: string) => {
    return currentTrack?.id === stationId && playerState === 'playing';
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Radio</h1>
        <p className="text-sm text-slate-400 mt-1">Live Islamic radio streams</p>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-3 w-48 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-12">
          <RadioIcon className="w-16 h-16 mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400">No radio stations available.</p>
          <p className="text-sm text-slate-500 mt-1">
            Add radio stations in Appwrite to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stations.map((station) => (
            <motion.div
              key={station.$id}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "glass-card rounded-xl p-4 transition-all",
                isPlaying(station.$id) && "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  {station.logoUrl ? (
                    <img
                      src={station.logoUrl}
                      alt={station.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center">
                      <RadioIcon className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  
                  {isPlaying(station.$id) && (
                    <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                      <div className="flex items-end gap-0.5 h-4">
                        <span className="w-1 bg-primary rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                        <span className="w-1 bg-primary rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                        <span className="w-1 bg-primary rounded-full animate-bounce" style={{ height: '40%', animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-slate-100">{station.name}</h3>
                  {station.description && (
                    <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
                      {station.description}
                    </p>
                  )}
                  {station.isLive && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handlePlayStation(station)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    isPlaying(station.$id)
                      ? "bg-primary text-slate-900"
                      : "bg-slate-800 text-slate-300 hover:bg-primary hover:text-slate-900"
                  )}
                >
                  {isPlaying(station.$id) ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} className="ml-0.5" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedStation && playerState === 'playing' && currentTrack?.id === selectedStation.$id && (
        <div className="fixed bottom-32 left-4 right-4 glass-card rounded-xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {selectedStation.logoUrl ? (
                <img
                  src={selectedStation.logoUrl}
                  alt={selectedStation.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <RadioIcon className="w-5 h-5 text-slate-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-100">{selectedStation.name}</p>
                <p className="text-xs text-primary">Now Playing</p>
              </div>
            </div>
            
            <button
              onClick={toggleMute}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                if (newVolume > 0 && isMuted) {
                  toggleMute();
                }
              }}
              className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}