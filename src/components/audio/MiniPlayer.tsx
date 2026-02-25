import { useState, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import { formatDuration, cn, PLAYBACK_SPEEDS, getPlaybackSpeedLabel } from '../../lib/utils';
import { getPlaylists, addToPlaylist } from '../../lib/db';
import {
  Play, Pause, SkipBack, SkipForward, X, Music2, Timer, Gauge, Moon, ChevronDown,
  Repeat, Repeat1, Heart, ListPlus, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Playlist } from '../../types';

function formatSleepTimer(ms: number | null): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SpeedSheet({
  speed,
  onSelect,
  onClose,
}: {
  speed: number;
  onSelect: (s: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-3xl p-6 z-10"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <Gauge size={18} className="text-primary" />
          Playback Speed
        </h3>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-700 text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {PLAYBACK_SPEEDS.map((s) => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { onSelect(s); onClose(); }}
            className={cn(
              'py-3 rounded-xl text-sm font-medium transition-all',
              speed === s
                ? 'bg-primary text-slate-900 shadow-lg shadow-primary/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {getPlaybackSpeedLabel(s)}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function SleepSheet({
  remaining,
  onSet,
  onClear,
  onClose,
}: {
  remaining: number | null;
  onSet: (m: number) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const options = [5, 10, 15, 30, 45, 60, 90];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-3xl p-6 z-10"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <Moon size={18} className="text-amber-400" />
          Sleep Timer
          {remaining && (
            <span className="text-sm text-amber-400 font-mono ml-1">({formatSleepTimer(remaining)})</span>
          )}
        </h3>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-700 text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {options.map((m) => (
          <motion.button
            key={m}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { onSet(m); onClose(); }}
            className="py-3 rounded-xl text-sm font-medium bg-slate-700 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 transition-all"
          >
            {m}m
          </motion.button>
        ))}
      </div>
      {remaining && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { onClear(); onClose(); }}
          className="mt-4 w-full py-3 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
        >
          Cancel Timer
        </motion.button>
      )}
    </motion.div>
  );
}

function PlaylistSheet({
  playlists,
  onSelect,
  onClose,
}: {
  playlists: Playlist[];
  onSelect: (playlistId: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-3xl p-6 z-10 max-h-80 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <ListPlus size={18} className="text-primary" />
          Add to Playlist
        </h3>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-700 text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
      {playlists.length === 0 ? (
        <p className="text-slate-400 text-center py-4">No playlists yet. Create one in the Playlists tab.</p>
      ) : (
        <div className="space-y-2">
          {playlists.map((playlist) => (
            <motion.button
              key={playlist.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(playlist.id!)}
              className="w-full p-3 rounded-xl bg-slate-700 text-slate-200 text-left hover:bg-slate-600 transition-all"
            >
              {playlist.name}
              {playlist.description && (
                <p className="text-xs text-slate-400 mt-1">{playlist.description}</p>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function MiniPlayer() {
  const navigate = useNavigate();
  const {
    currentTrack,
    playerState,
    position,
    duration,
    playbackSpeed,
    sleepTimerRemaining,
    repeatMode,
    hasNext,
    hasPrevious,
    isFavoriteTrack,
    togglePlayPause,
    seek,
    stop,
    setPlaybackSpeed,
    setSleepTimer,
    clearSleepTimer,
    toggleRepeat,
    playNext,
    playPrevious,
    toggleFavorite,
    play,
  } = useAudio();

  const [showControls, setShowControls] = useState(false);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const isLoading = playerState === 'loading';
  const isPlaying = playerState === 'playing';
  const hasTrack = !!currentTrack;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  useEffect(() => {
    if (showPlaylistPicker) {
      getPlaylists().then(setPlaylists);
    }
  }, [showPlaylistPicker]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      seek((x / rect.width) * duration);
    }
  };

  const handleOpenPlayer = () => {
    navigate('/player');
  };

  const handlePlayResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerState === 'paused' || playerState === 'playing') {
      togglePlayPause();
    } else if (currentTrack) {
      play(currentTrack, position);
    }
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (currentTrack) {
      await addToPlaylist(playlistId, currentTrack.id);
      setShowPlaylistPicker(false);
    }
  };

  if (!hasTrack) return null;

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-16 left-0 right-0 z-40 px-2"
      >
        <div className="max-w-lg mx-auto relative">
          <div className="glass-card-dark rounded-2xl overflow-hidden border border-primary/10 hover:border-primary/20 transition-colors">
            {/* Progress strip */}
            <div
              className="h-0.5 bg-slate-800 cursor-pointer relative group"
              onClick={handleProgressClick}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="px-3 py-2.5 flex items-center gap-3">
              {/* Artwork */}
              <button
                onClick={handleOpenPlayer}
                className="relative flex-shrink-0 group"
                aria-label="Open player"
              >
                {currentTrack.artworkUrl ? (
                  <img
                    src={currentTrack.artworkUrl}
                    alt={currentTrack.title}
                    className="w-11 h-11 rounded-xl object-cover shadow-lg group-hover:shadow-primary/30 transition-shadow"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                    <Music2 className="w-5 h-5 text-primary" />
                  </div>
                )}
                {isPlaying && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                  </motion.div>
                )}
              </button>

              {/* Track info */}
              <button
                className="flex-1 min-w-0 text-left"
                onClick={handleOpenPlayer}
                aria-label="Open player"
              >
                <p className="text-sm font-medium text-slate-100 truncate leading-tight">
                  {currentTrack.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-400 truncate max-w-[120px]">
                    {currentTrack.speaker || 'Muslim Central'}
                  </span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] text-primary font-mono tabular-nums">
                    {formatDuration(position)}
                  </span>
                  {duration > 0 && (
                    <>
                      <span className="text-[10px] text-slate-600">/</span>
                      <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                        {formatDuration(duration)}
                      </span>
                    </>
                  )}
                  {playbackSpeed !== 1 && (
                    <span className="text-[10px] text-violet-400 font-mono">
                      {getPlaybackSpeedLabel(playbackSpeed)}
                    </span>
                  )}
                  {sleepTimerRemaining && (
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                      <Moon size={9} />
                      {formatSleepTimer(sleepTimerRemaining)}
                    </span>
                  )}
                </div>
              </button>

              {/* Controls */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {hasPrevious && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); playPrevious(); }}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={16} />
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); seek(Math.max(0, position - 15)); }}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  aria-label="Skip back 15s"
                >
                  <SkipBack size={16} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayResume}
                  disabled={isLoading}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                    isLoading
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-gradient-to-br from-primary to-primary-dark text-slate-900 shadow-lg shadow-primary/30'
                  )}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoading
                    ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    : isPlaying
                    ? <Pause size={17} />
                    : <Play size={17} className="ml-0.5" />
                  }
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); seek(Math.min(duration, position + 30)); }}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  aria-label="Skip forward 30s"
                >
                  <SkipForward size={16} />
                </motion.button>

                {hasNext && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); playNext(); }}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight size={16} />
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); setShowControls(!showControls); }}
                  className={cn("p-1.5 transition-colors", showControls ? "text-primary" : "text-slate-500 hover:text-white")}
                >
                  <ChevronDown size={16} className={cn("transition-transform", showControls && "rotate-180")} />
                </motion.button>
              </div>
            </div>

            {/* Expanded controls */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 flex items-center justify-around flex-wrap gap-2">
                    {/* Repeat */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleRepeat}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                        repeatMode !== 'off' ? "bg-primary/20 text-primary" : "bg-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      <RepeatIcon size={18} />
                      <span className="text-[10px]">{repeatMode === 'one' ? 'One' : repeatMode === 'all' ? 'All' : 'Off'}</span>
                    </motion.button>

                    {/* Favorite */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleFavorite}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                        isFavoriteTrack ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      <Heart size={18} className={isFavoriteTrack ? "fill-current" : ""} />
                      <span className="text-[10px]">{isFavoriteTrack ? 'Liked' : 'Like'}</span>
                    </motion.button>

                    {/* Sleep Timer */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setShowSleepPicker(!showSleepPicker); setShowSpeedPicker(false); setShowPlaylistPicker(false); }}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                        sleepTimerRemaining ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      <Timer size={18} />
                      <span className="text-[10px]">{sleepTimerRemaining ? formatSleepTimer(sleepTimerRemaining) : 'Sleep'}</span>
                    </motion.button>

                    {/* Speed */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setShowSpeedPicker(!showSpeedPicker); setShowSleepPicker(false); setShowPlaylistPicker(false); }}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                        playbackSpeed !== 1 ? "bg-violet-500/20 text-violet-400" : "bg-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      <Gauge size={18} />
                      <span className="text-[10px]">{getPlaybackSpeedLabel(playbackSpeed)}</span>
                    </motion.button>

                    {/* Add to Playlist */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setShowPlaylistPicker(!showPlaylistPicker); setShowSpeedPicker(false); setShowSleepPicker(false); }}
                      className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
                    >
                      <ListPlus size={18} />
                      <span className="text-[10px]">Playlist</span>
                    </motion.button>

                    {/* Stop */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => stop()}
                      className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 transition-all"
                    >
                      <X size={18} />
                      <span className="text-[10px]">Stop</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom sheets */}
          <AnimatePresence>
            {showSpeedPicker && (
              <SpeedSheet
                speed={playbackSpeed}
                onSelect={setPlaybackSpeed}
                onClose={() => setShowSpeedPicker(false)}
              />
            )}
            {showSleepPicker && (
              <SleepSheet
                remaining={sleepTimerRemaining}
                onSet={setSleepTimer}
                onClear={clearSleepTimer}
                onClose={() => setShowSleepPicker(false)}
              />
            )}
            {showPlaylistPicker && (
              <PlaylistSheet
                playlists={playlists}
                onSelect={handleAddToPlaylist}
                onClose={() => setShowPlaylistPicker(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}