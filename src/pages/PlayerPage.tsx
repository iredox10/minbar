import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, X, Music2, Timer, Gauge,
  ChevronDown, RotateCcw, RotateCw, Volume2, VolumeX, Moon,
  Repeat, Repeat1, Heart, ListPlus, ChevronLeft, ChevronRight,
  Share2
} from 'lucide-react';
import { formatDuration, cn, PLAYBACK_SPEEDS, getPlaybackSpeedLabel } from '../lib/utils';
import { getPlaylists, addToPlaylist } from '../lib/db';
import type { Playlist } from '../types';
import { ShareSheet } from '../components/audio/ShareSheet';

function formatSleepTimer(ms: number | null): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function WaveformBars({ playing }: { playing: boolean }) {
  const bars = [0.4, 1, 0.6, 0.85, 0.5, 0.95, 0.65, 0.75, 0.45, 0.9];
  return (
    <div className="flex items-end gap-[2px] h-5">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={playing ? { scaleY: [h * 0.3, h, h * 0.5, h * 0.9, h * 0.4] } : { scaleY: 0.15 }}
          transition={playing ? {
            duration: 0.8 + i * 0.07,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
            delay: i * 0.06,
          } : { duration: 0.3 }}
          style={{ height: '100%', originY: 1 }}
        />
      ))}
    </div>
  );
}

function VinylDisc({ artworkUrl, title, playing }: { artworkUrl?: string; title: string; playing: boolean }) {
  return (
    <div className="relative">
      <motion.div
        animate={playing ? { rotate: 360 } : {}}
        transition={playing ? { duration: 8, repeat: Infinity, ease: 'linear' } : {}}
        className="w-64 h-64 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, #1e293b, #334155, #1e293b, #0f172a, #1e293b)',
          boxShadow: playing
            ? '0 0 60px rgba(212,168,83,0.4), 0 0 120px rgba(212,168,83,0.15)'
            : '0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {[0.75, 0.65, 0.55].map((scale, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border border-slate-700/30"
            style={{ margin: `${(1 - scale) * 50}%` }}
          />
        ))}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full overflow-hidden border-4 border-slate-900"
          style={{ boxShadow: '0 0 0 2px rgba(212,168,83,0.3)' }}
        >
          {artworkUrl ? (
            <img src={artworkUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center">
              <Music2 className="w-10 h-10 text-primary" />
            </div>
          )}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 border border-slate-700" />
      </motion.div>
    </div>
  );
}

function ProgressBar({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (pos: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const displayProgress = dragging ? dragProgress : progress;

  const handleInteraction = (clientX: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    setDragging(true);
    setDragProgress(handleInteraction(e.clientX, rect) * 100);
    
    const handleMove = (ev: MouseEvent) => {
      setDragProgress(handleInteraction(ev.clientX, rect) * 100);
    };
    const handleUp = (ev: MouseEvent) => {
      const pct = handleInteraction(ev.clientX, rect);
      onSeek(pct * duration);
      setDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    setDragging(true);
    setDragProgress(handleInteraction(e.touches[0].clientX, rect) * 100);
    
    const handleMove = (ev: TouchEvent) => {
      setDragProgress(handleInteraction(ev.touches[0].clientX, rect) * 100);
    };
    const handleEnd = (ev: TouchEvent) => {
      const pct = handleInteraction(ev.changedTouches[0].clientX, rect);
      onSeek(pct * duration);
      setDragging(false);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  return (
    <div className="w-full select-none">
      <div
        ref={() => {}}
        className="relative h-10 flex items-center cursor-pointer group"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-visible relative">
          <div className="absolute inset-0 bg-slate-600 rounded-full" style={{ width: `${Math.min(displayProgress + 10, 100)}%` }} />
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light rounded-full transition-none"
            style={{ width: `${displayProgress}%` }}
          />
          <motion.div
            animate={{ scale: dragging ? 1.6 : 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-primary/40 border-2 border-primary group-hover:scale-125 transition-transform"
            style={{ left: `calc(${displayProgress}% - 8px)` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-400 font-mono -mt-1">
        <span>{formatDuration(dragging ? (dragProgress / 100) * duration : position)}</span>
        <span>{duration > 0 ? formatDuration(duration) : '--:--'}</span>
      </div>
    </div>
  );
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

export function PlayerPage() {
  const navigate = useNavigate();
  const {
    currentTrack,
    playerState,
    position,
    duration,
    playbackSpeed,
    volume,
    isMuted,
    sleepTimerRemaining,
    repeatMode,
    hasNext,
    hasPrevious,
    isFavoriteTrack,
    togglePlayPause,
    seek,
    seekRelative,
    setPlaybackSpeed,
    setVolume,
    toggleMute,
    setSleepTimer,
    clearSleepTimer,
    stop,
    toggleRepeat,
    playNext,
    playPrevious,
    toggleFavorite,
    play,
  } = useAudio();

  const [sheet, setSheet] = useState<'speed' | 'sleep' | 'playlist' | 'share' | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const isPlaying = playerState === 'playing';
  const isLoading = playerState === 'loading';

  useEffect(() => {
    if (!currentTrack) {
      navigate('/', { replace: true });
    }
  }, [currentTrack, navigate]);

  useEffect(() => {
    if (sheet === 'playlist') {
      getPlaylists().then(setPlaylists);
    }
  }, [sheet]);

  const handleAddToPlaylist = async (playlistId: number) => {
    if (currentTrack) {
      await addToPlaylist(playlistId, currentTrack.id);
      setSheet(null);
    }
  };

  const handlePlayResume = () => {
    if (playerState === 'paused' || playerState === 'playing') {
      togglePlayPause();
    } else if (currentTrack) {
      play(currentTrack, position);
    }
  };

  if (!currentTrack) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No track playing</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary text-slate-900 rounded-xl font-medium"
          >
            Browse Content
          </button>
        </div>
      </div>
    );
  }

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col relative overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-slate-900 overflow-hidden">
        {currentTrack.artworkUrl && (
          <img
            src={currentTrack.artworkUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-20"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col h-full max-w-md mx-auto w-full px-6 pt-16 pb-24">

        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronDown size={22} />
          </motion.button>

          <div className="text-center">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
              {currentTrack.type === 'radio' ? 'Live Radio' : currentTrack.type === 'dua' ? 'Dua' : 'Now Playing'}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { stop(); navigate('/'); }}
            className="p-2.5 rounded-xl bg-slate-800/60 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Vinyl artwork */}
        <div className="flex-1 flex items-center justify-center py-4 min-h-0">
          <VinylDisc
            artworkUrl={currentTrack.artworkUrl}
            title={currentTrack.title}
            playing={isPlaying}
          />
        </div>

        {/* Track info */}
        <div className="text-center mb-6">
          <motion.h2
            key={currentTrack.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold text-slate-100 line-clamp-2 leading-tight mb-1"
          >
            {currentTrack.title}
          </motion.h2>
          <p className="text-sm text-slate-400">{currentTrack.speaker || 'Muslim Central'}</p>

          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
            {playbackSpeed !== 1 && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-500/20 text-violet-400 font-mono">
                {getPlaybackSpeedLabel(playbackSpeed)}
              </span>
            )}
            {sleepTimerRemaining && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 font-mono flex items-center gap-1">
                <Moon size={11} />
                {formatSleepTimer(sleepTimerRemaining)}
              </span>
            )}
            {isLoading && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-700 text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full border border-slate-400 border-t-transparent animate-spin" />
                Loading…
              </span>
            )}
          </div>
        </div>

        {/* Waveform */}
        <div className="flex justify-center mb-4">
          <WaveformBars playing={isPlaying} />
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <ProgressBar position={position} duration={duration} onSeek={seek} />
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Previous */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={playPrevious}
            disabled={!hasPrevious}
            className={cn(
              "p-3 rounded-full transition-colors",
              hasPrevious ? "text-slate-400 hover:text-white" : "text-slate-700"
            )}
            aria-label="Previous"
          >
            <ChevronLeft size={28} />
          </motion.button>

          {/* -15s */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => seekRelative(-15)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <div className="relative">
              <RotateCcw size={24} />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold pt-0.5">15</span>
            </div>
          </motion.button>

          {/* Play/Pause */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayResume}
            disabled={isLoading}
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center transition-all relative',
              isLoading
                ? 'bg-slate-700 text-slate-400'
                : 'bg-gradient-to-br from-primary to-primary-dark text-slate-900 shadow-2xl shadow-primary/40 animate-pulse-gold'
            )}
          >
            {isLoading ? (
              <div className="w-7 h-7 border-3 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={32} />
            ) : (
              <Play size={32} className="ml-1" />
            )}
          </motion.button>

          {/* +30s */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => seekRelative(30)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <div className="relative">
              <RotateCw size={24} />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold pt-0.5">30</span>
            </div>
          </motion.button>

          {/* Next */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={playNext}
            disabled={!hasNext}
            className={cn(
              "p-3 rounded-full transition-colors",
              hasNext ? "text-slate-400 hover:text-white" : "text-slate-700"
            )}
            aria-label="Next"
          >
            <ChevronRight size={28} />
          </motion.button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          {/* Repeat */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleRepeat}
            className={cn(
              'flex flex-col items-center gap-1 text-xs font-medium px-3 py-2 rounded-xl transition-all',
              repeatMode !== 'off' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <RepeatIcon size={18} />
            <span>{repeatMode === 'one' ? 'One' : repeatMode === 'all' ? 'All' : 'Off'}</span>
          </motion.button>

          {/* Favorite */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFavorite}
            className={cn(
              'flex flex-col items-center gap-1 text-xs font-medium px-3 py-2 rounded-xl transition-all',
              isFavoriteTrack ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <Heart size={18} className={isFavoriteTrack ? 'fill-current' : ''} />
            <span>{isFavoriteTrack ? 'Liked' : 'Like'}</span>
          </motion.button>

          {/* Mute / Volume */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={cn(
              'flex flex-col items-center gap-1 text-xs font-medium px-3 py-2 rounded-xl transition-all',
              isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>{isMuted ? 'Muted' : 'Volume'}</span>
          </motion.button>

          {/* Speed */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSheet(sheet === 'speed' ? null : 'speed')}
            className={cn(
              'flex flex-col items-center gap-1 text-xs font-medium px-3 py-2 rounded-xl transition-all',
              playbackSpeed !== 1 ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <Gauge size={18} />
            <span>{getPlaybackSpeedLabel(playbackSpeed)}</span>
          </motion.button>

          {/* Sleep Timer */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSheet(sheet === 'sleep' ? null : 'sleep')}
            className={cn(
              'flex flex-col items-center gap-1 text-xs font-medium px-3 py-2 rounded-xl transition-all',
              sleepTimerRemaining ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <Timer size={18} />
            <span>{sleepTimerRemaining ? formatSleepTimer(sleepTimerRemaining) : 'Sleep'}</span>
          </motion.button>

          {/* Add to Playlist */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSheet(sheet === 'playlist' ? null : 'playlist')}
            className="flex flex-col items-center gap-1 text-xs font-medium px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <ListPlus size={18} />
            <span>Playlist</span>
          </motion.button>

          {/* Share clip */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSheet(sheet === 'share' ? null : 'share')}
            disabled={currentTrack?.type === 'radio'}
            className={cn(
              'flex flex-col items-center gap-1 text-xs font-medium px-3 py-2 rounded-xl transition-all',
              sheet === 'share'
                ? 'bg-primary/20 text-primary'
                : currentTrack?.type === 'radio'
                ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <Share2 size={18} />
            <span>Share</span>
          </motion.button>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-3 mb-8">
          <VolumeX size={14} className="text-slate-500 flex-shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (isMuted && v > 0) toggleMute();
            }}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
          />
          <Volume2 size={14} className="text-slate-500 flex-shrink-0" />
        </div>
      </div>

      {/* Bottom sheets */}
      <AnimatePresence>
        {sheet === 'speed' && (
          <SpeedSheet
            speed={playbackSpeed}
            onSelect={setPlaybackSpeed}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet === 'sleep' && (
          <SleepSheet
            remaining={sleepTimerRemaining}
            onSet={setSleepTimer}
            onClear={clearSleepTimer}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet === 'playlist' && (
          <PlaylistSheet
            playlists={playlists}
            onSelect={handleAddToPlaylist}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet === 'share' && currentTrack && (
          <ShareSheet
            track={currentTrack}
            currentPosition={position}
            totalDuration={duration}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}