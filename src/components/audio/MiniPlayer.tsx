import { useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { formatDuration, cn, PLAYBACK_SPEEDS, getPlaybackSpeedLabel } from '../../lib/utils';
import { Play, Pause, SkipBack, SkipForward, X, Music2, Timer, Gauge, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function formatSleepTimer(ms: number | null): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MiniPlayer() {
  const {
    currentTrack,
    playerState,
    position,
    duration,
    playbackSpeed,
    sleepTimerRemaining,
    togglePlayPause,
    seek,
    stop,
    setPlaybackSpeed,
    setSleepTimer,
    clearSleepTimer
  } = useAudio();

  const [showControls, setShowControls] = useState(false);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  const navigate = useNavigate();

  if (!currentTrack || playerState === 'idle') {
    return null;
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const isLoading = playerState === 'loading';

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  };

  const handleOpenPlayer = () => {
    if (currentTrack.type === 'episode') {
      navigate(`/podcasts/episode/${currentTrack.id}`);
    } else if (currentTrack.type === 'radio') {
      navigate('/radio');
    } else if (currentTrack.type === 'dua') {
      navigate(`/duas/${currentTrack.id}`);
    }
  };

  const sleepTimerOptions = [5, 10, 15, 30, 45, 60, 90];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-16 left-0 right-0 z-40 px-2"
      >
        <div className="max-w-lg mx-auto">
          <div className="glass-card-dark rounded-2xl overflow-hidden cursor-pointer border border-primary/10 hover:border-primary/30 transition-colors">
            <div className="h-1 bg-slate-800 cursor-pointer relative group" onClick={handleProgressClick}>
              <motion.div
                className="absolute bottom-0 left-0 h-full bg-gradient-to-r from-primary to-primary-light"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="p-3 flex items-center gap-3" onClick={handleOpenPlayer}>
              <div className="relative flex-shrink-0">
                {currentTrack.artworkUrl ? (
                  <img src={currentTrack.artworkUrl} alt={currentTrack.title} className="w-12 h-12 rounded-xl object-cover shadow-lg" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                    <Music2 className="w-6 h-6 text-primary" />
                  </div>
                )}
                {playerState === 'playing' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  </motion.div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{currentTrack.title}</p>
                <p className="text-xs text-slate-400 truncate">{currentTrack.speaker || 'Muslim Central'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-primary font-mono tabular-nums">{formatDuration(position)}</span>
                  {duration > 0 && (
                    <>
                      <span className="text-[10px] text-slate-600">/</span>
                      <span className="text-[10px] text-slate-500 font-mono tabular-nums">{formatDuration(duration)}</span>
                    </>
                  )}
                  {playbackSpeed !== 1 && (
                    <span className="text-[10px] text-violet-400 font-mono ml-1">{getPlaybackSpeedLabel(playbackSpeed)}</span>
                  )}
                  {sleepTimerRemaining && (
                    <span className="text-[10px] text-amber-400 font-mono ml-1">⏱ {formatSleepTimer(sleepTimerRemaining)}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); seek(Math.max(0, position - 15)); }}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <SkipBack size={16} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                  disabled={isLoading}
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all relative overflow-hidden",
                    isLoading ? "bg-slate-700 text-slate-400" : "bg-gradient-to-br from-primary to-primary-dark text-slate-900 shadow-lg shadow-primary/30"
                  )}
                >
                  {isLoading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : playerState === 'playing' ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); seek(Math.min(duration, position + 30)); }}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <SkipForward size={16} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); setShowControls(!showControls); }}
                  className={cn("p-2 transition-colors", showControls ? "text-primary" : "text-slate-500 hover:text-white")}
                >
                  <ChevronUp size={16} className={cn("transition-transform", showControls && "rotate-180")} />
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 flex items-center justify-around">
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setShowSleepPicker(!showSleepPicker); setShowSpeedPicker(false); }}
                        className={cn(
                          "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                          sleepTimerRemaining ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        <Timer size={18} />
                        <span className="text-[10px]">Sleep</span>
                        {sleepTimerRemaining && <span className="text-[10px] font-mono">{formatSleepTimer(sleepTimerRemaining)}</span>}
                      </motion.button>
                      
                      <AnimatePresence>
                        {showSleepPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl"
                          >
                            <div className="flex flex-col gap-1">
                              {sleepTimerOptions.map((mins) => (
                                <button
                                  key={mins}
                                  onClick={() => { setSleepTimer(mins); setShowSleepPicker(false); }}
                                  className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg whitespace-nowrap"
                                >
                                  {mins} min
                                </button>
                              ))}
                              {sleepTimerRemaining && (
                                <button
                                  onClick={() => { clearSleepTimer(); setShowSleepPicker(false); }}
                                  className="px-4 py-2 text-sm text-rose-400 hover:bg-slate-700 rounded-lg"
                                >
                                  Cancel Timer
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setShowSpeedPicker(!showSpeedPicker); setShowSleepPicker(false); }}
                        className={cn(
                          "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                          playbackSpeed !== 1 ? "bg-violet-500/20 text-violet-400" : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        <Gauge size={18} />
                        <span className="text-[10px]">Speed</span>
                        <span className="text-[10px] font-mono">{getPlaybackSpeedLabel(playbackSpeed)}</span>
                      </motion.button>
                      
                      <AnimatePresence>
                        {showSpeedPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl"
                          >
                            <div className="grid grid-cols-4 gap-1">
                              {PLAYBACK_SPEEDS.map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => { setPlaybackSpeed(speed); setShowSpeedPicker(false); }}
                                  className={cn(
                                    "px-3 py-2 text-sm rounded-lg transition-all",
                                    playbackSpeed === speed ? "bg-primary text-slate-900 font-medium" : "text-slate-300 hover:bg-slate-700"
                                  )}
                                >
                                  {getPlaybackSpeedLabel(speed)}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => stop()}
                      className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
                    >
                      <X size={18} />
                      <span className="text-[10px]">Close</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}