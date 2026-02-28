import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, X, Music2, Gauge,
  ChevronDown, RotateCcw, RotateCw, Volume2, VolumeX, Moon,
  Repeat, Repeat1, Heart, ListPlus,
  SkipBack, SkipForward,
  Share2, Download, CheckCircle2
} from 'lucide-react';
import { formatDuration, cn, PLAYBACK_SPEEDS, getPlaybackSpeedLabel } from '../lib/utils';
import { getPlaylists, addToPlaylist } from '../lib/db';
import type { Playlist } from '../types';
import { ShareSheet } from '../components/audio/ShareSheet';
import { DownloadSheet } from '../components/audio/DownloadSheet';
import { useDownload } from '../hooks/useDownload';

function formatSleepTimer(ms: number | null): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────
   Waveform
───────────────────────────────────────────── */
function WaveformBars({ playing }: { playing: boolean }) {
  const bars = [0.4, 1, 0.6, 0.85, 0.5, 0.95, 0.65, 0.75, 0.45, 0.9];
  return (
    <div className="flex items-end gap-[3px] h-5">
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

/* ─────────────────────────────────────────────
   Artwork card (replaces vinyl disc)
───────────────────────────────────────────── */
function ArtworkCard({ artworkUrl, title, playing }: { artworkUrl?: string; title: string; playing: boolean }) {
  return (
    <motion.div
      animate={playing ? { boxShadow: ['0 0 40px rgba(212,168,83,0.25)', '0 0 70px rgba(212,168,83,0.45)', '0 0 40px rgba(212,168,83,0.25)'] } : { boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      transition={playing ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
      className={cn(
        'relative rounded-2xl overflow-hidden aspect-square w-full max-w-xs',
        playing && 'ring-2 ring-primary/50',
      )}
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
    >
      {artworkUrl ? (
        <img src={artworkUrl} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/30 via-indigo-600/20 to-violet-700/30 flex items-center justify-center">
          <Music2 className="w-16 h-16 text-primary/60" />
        </div>
      )}
      {/* Subtle inner vignette */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Progress bar
───────────────────────────────────────────── */
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
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setDragProgress(handleInteraction(e.clientX, rect) * 100);

    const handleMove = (ev: MouseEvent) => {
      setDragProgress(handleInteraction(ev.clientX, rect) * 100);
    };
    const handleUp = (ev: MouseEvent) => {
      onSeek(handleInteraction(ev.clientX, rect) * duration);
      setDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setDragProgress(handleInteraction(e.touches[0].clientX, rect) * 100);

    const handleMove = (ev: TouchEvent) => {
      setDragProgress(handleInteraction(ev.touches[0].clientX, rect) * 100);
    };
    const handleEnd = (ev: TouchEvent) => {
      onSeek(handleInteraction(ev.changedTouches[0].clientX, rect) * duration);
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
        className="relative h-10 flex items-center cursor-pointer group"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="w-full h-1 bg-slate-700/80 rounded-full overflow-visible relative">
          {/* Buffer ghost */}
          <div
            className="absolute inset-0 bg-slate-600/50 rounded-full"
            style={{ width: `${Math.min(displayProgress + 8, 100)}%` }}
          />
          {/* Fill */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary to-amber-400 rounded-full transition-none"
            style={{ width: `${displayProgress}%` }}
          />
          {/* Thumb */}
          <motion.div
            animate={{ scale: dragging ? 1.5 : 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-primary/40 border-2 border-primary group-hover:scale-125 transition-transform"
            style={{ left: `calc(${displayProgress}% - 7px)` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-slate-500 font-mono -mt-1 px-0.5">
        <span>{formatDuration(dragging ? (dragProgress / 100) * duration : position)}</span>
        <span>{duration > 0 ? formatDuration(duration) : '--:--'}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sheet backdrop
───────────────────────────────────────────── */
function SheetBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 z-10"
      onClick={onClose}
    />
  );
}

/* ─────────────────────────────────────────────
   Speed sheet
───────────────────────────────────────────── */
function SpeedSheet({ speed, onSelect, onClose }: { speed: number; onSelect: (s: number) => void; onClose: () => void }) {
  return (
    <motion.div
      key="speed-sheet"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 rounded-t-3xl p-6 z-20"
    >
      <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <Gauge size={18} className="text-violet-400" />
          Playback Speed
        </h3>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {PLAYBACK_SPEEDS.map((s) => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { onSelect(s); onClose(); }}
            className={cn(
              'py-3 rounded-xl text-sm font-medium transition-all',
              speed === s
                ? 'bg-violet-500/30 text-violet-300 ring-1 ring-violet-500/50 shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            )}
          >
            {getPlaybackSpeedLabel(s)}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Sleep sheet
───────────────────────────────────────────── */
function SleepSheet({ remaining, onSet, onClear, onClose }: { remaining: number | null; onSet: (m: number) => void; onClear: () => void; onClose: () => void }) {
  const options = [5, 10, 15, 30, 45, 60, 90];
  return (
    <motion.div
      key="sleep-sheet"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 rounded-t-3xl p-6 z-20"
    >
      <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <Moon size={18} className="text-amber-400" />
          Sleep Timer
          {remaining && (
            <span className="text-sm text-amber-400 font-mono">({formatSleepTimer(remaining)})</span>
          )}
        </h3>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {options.map((m) => (
          <motion.button
            key={m}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { onSet(m); onClose(); }}
            className="py-3 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 transition-all"
          >
            {m}m
          </motion.button>
        ))}
      </div>
      {remaining && (
        <motion.button
          whileHover={{ scale: 1.01 }}
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

/* ─────────────────────────────────────────────
   Playlist sheet
───────────────────────────────────────────── */
function PlaylistSheet({ playlists, onSelect, onClose }: { playlists: Playlist[]; onSelect: (id: number) => void; onClose: () => void }) {
  return (
    <motion.div
      key="playlist-sheet"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 rounded-t-3xl p-6 z-20 max-h-80 overflow-y-auto"
    >
      <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <ListPlus size={18} className="text-primary" />
          Add to Playlist
        </h3>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      {playlists.length === 0 ? (
        <p className="text-slate-400 text-center py-4 text-sm">No playlists yet. Create one in the Playlists tab.</p>
      ) : (
        <div className="space-y-2">
          {playlists.map((pl) => (
            <motion.button
              key={pl.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(pl.id!)}
              className="w-full p-3.5 rounded-xl bg-slate-800 text-slate-200 text-left hover:bg-slate-700 transition-all"
            >
              <span className="font-medium text-sm">{pl.name}</span>
              {pl.description && (
                <p className="text-xs text-slate-400 mt-0.5">{pl.description}</p>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Volume slider (inline)
───────────────────────────────────────────── */
function VolumeSlider({ volume, isMuted, setVolume, toggleMute }: { volume: number; isMuted: boolean; setVolume: (v: number) => void; toggleMute: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const displayVolume = isMuted ? 0 : volume;

  const handleInteraction = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const v = x / rect.width;
    setVolume(v);
    if (isMuted && v > 0) toggleMute();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleInteraction(e.clientX);
    const handleMove = (ev: MouseEvent) => handleInteraction(ev.clientX);
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleInteraction(e.touches[0].clientX);
    const handleMove = (ev: TouchEvent) => handleInteraction(ev.touches[0].clientX);
    const handleEnd = () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-1 select-none"
    >
      <button onClick={toggleMute} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
        {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <div
        ref={trackRef}
        className="relative flex-1 h-8 flex items-center cursor-pointer group"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="w-full h-1 bg-slate-700 rounded-full overflow-visible relative">
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary to-amber-400 rounded-full"
            style={{ width: `${displayVolume * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow border border-primary/60 group-hover:scale-125 transition-transform"
            style={{ left: `calc(${displayVolume * 100}% - 6px)` }}
          />
        </div>
      </div>
      <span className="text-[11px] text-slate-500 font-mono w-7 text-right flex-shrink-0">
        {Math.round(displayVolume * 100)}
      </span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main PlayerPage
───────────────────────────────────────────── */
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

  const [sheet, setSheet] = useState<'speed' | 'sleep' | 'playlist' | 'share' | 'download' | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showVolume, setShowVolume] = useState(false);

  const { status: dlStatus } = useDownload(
    currentTrack?.id ?? '',
    currentTrack?.audioUrl ?? '',
    currentTrack?.title ?? '',
    currentTrack?.seriesId,
    undefined,
    currentTrack?.duration,
  );

  const isPlaying = playerState === 'playing';
  const isLoading = playerState === 'loading';

  useEffect(() => {
    if (!currentTrack) navigate('/', { replace: true });
  }, [currentTrack, navigate]);

  useEffect(() => {
    if (sheet === 'playlist') getPlaylists().then(setPlaylists);
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

  const openSheet = (name: typeof sheet) => setSheet(prev => prev === name ? null : name);

  if (!currentTrack) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No track playing</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-primary text-slate-900 rounded-xl font-medium">
            Browse Content
          </button>
        </div>
      </div>
    );
  }

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const isRadio = currentTrack.type === 'radio';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col relative overflow-hidden bg-slate-900"
    >
      {/* ── Blurred artwork background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {currentTrack.artworkUrl && (
          <img
            src={currentTrack.artworkUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-[0.18]"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 player-bg-overlay" />
      </div>

      {/* ── Scrollable content ── */}
      <div className="relative flex flex-col min-h-screen max-w-md mx-auto w-full px-5 pt-14 pb-10 gap-0">

        {/* ─── Zone 1: Top bar ─── */}
        <div className="flex items-center justify-between py-3 mb-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-full bg-slate-800/70 text-slate-400 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <ChevronDown size={20} />
          </motion.button>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {isRadio ? 'Live Radio' : currentTrack.type === 'dua' ? 'Dua' : 'Now Playing'}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { stop(); navigate('/'); }}
            className="p-2.5 rounded-full bg-slate-800/70 text-slate-400 hover:text-rose-400 transition-colors"
            aria-label="Stop and close"
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* ─── Zone 2: Hero artwork ─── */}
        <div className="flex justify-center items-center py-4">
          <ArtworkCard artworkUrl={currentTrack.artworkUrl} title={currentTrack.title} playing={isPlaying} />
        </div>

        {/* ─── Zone 3: Controls ─── */}

        {/* Track info */}
        <div className="mt-5 mb-3">
          <motion.h2
            key={currentTrack.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[1.15rem] font-bold text-white line-clamp-2 leading-snug"
          >
            {currentTrack.title}
          </motion.h2>
          <p className="text-sm text-slate-400 mt-1">{currentTrack.speaker || 'Arewa Central'}</p>

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {playbackSpeed !== 1 && (
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-violet-500/20 text-violet-300 font-mono">
                {getPlaybackSpeedLabel(playbackSpeed)}
              </span>
            )}
            {sleepTimerRemaining && (
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono flex items-center gap-1">
                <Moon size={10} />
                {formatSleepTimer(sleepTimerRemaining)}
              </span>
            )}
            {isLoading && (
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-700/80 text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full border border-slate-400 border-t-transparent animate-spin" />
                Loading…
              </span>
            )}
          </div>
        </div>

        {/* Action row: favorite, playlist, download, share */}
        <div className="flex items-center justify-between px-2 mb-4">
          {/* Favorite */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleFavorite}
            aria-label="Toggle favorite"
            className={cn(
              'p-2.5 rounded-full transition-all',
              isFavoriteTrack
                ? 'text-rose-400 bg-rose-500/15'
                : 'text-slate-500 hover:text-rose-400'
            )}
          >
            <Heart size={22} className={isFavoriteTrack ? 'fill-current' : ''} />
          </motion.button>

          {/* Add to playlist */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => openSheet('playlist')}
            aria-label="Add to playlist"
            className="p-2.5 rounded-full text-slate-500 hover:text-primary transition-all"
          >
            <ListPlus size={22} />
          </motion.button>

          {/* Download */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => !isRadio && openSheet('download')}
            disabled={isRadio}
            aria-label="Download"
            className={cn(
              'p-2.5 rounded-full transition-all',
              dlStatus === 'done'
                ? 'text-emerald-400 bg-emerald-500/15'
                : isRadio
                ? 'text-slate-700 cursor-not-allowed'
                : 'text-slate-500 hover:text-primary'
            )}
          >
            {dlStatus === 'done' ? <CheckCircle2 size={22} /> : <Download size={22} />}
          </motion.button>

          {/* Share */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => !isRadio && openSheet('share')}
            disabled={isRadio}
            aria-label="Share"
            className={cn(
              'p-2.5 rounded-full transition-all',
              isRadio ? 'text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-primary'
            )}
          >
            <Share2 size={22} />
          </motion.button>
        </div>

        {/* Waveform */}
        <div className="flex justify-center mb-3">
          <WaveformBars playing={isPlaying} />
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <ProgressBar position={position} duration={duration} onSeek={seek} />
        </div>

        {/* Main transport */}
        <div className="flex items-center justify-between px-1 mb-5">
          {/* Skip previous */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={playPrevious}
            disabled={!hasPrevious}
            aria-label="Previous track"
            className={cn(
              'p-2 rounded-full transition-colors',
              hasPrevious ? 'text-slate-300 hover:text-white' : 'text-slate-700'
            )}
          >
            <SkipBack size={26} />
          </motion.button>

          {/* Rewind 15s */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => seekRelative(-15)}
            aria-label="Rewind 15 seconds"
            className="relative p-2 rounded-full text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw size={26} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-300 pt-[2px]">15</span>
          </motion.button>

          {/* Play / Pause */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={handlePlayResume}
            disabled={isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={cn(
              'w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all shadow-xl',
              isLoading
                ? 'bg-slate-700 text-slate-400'
                : 'bg-gradient-to-br from-primary via-amber-400 to-primary-dark text-slate-900 shadow-primary/40 animate-pulse-gold'
            )}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={30} />
            ) : (
              <Play size={30} className="ml-1" />
            )}
          </motion.button>

          {/* Forward 30s */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => seekRelative(30)}
            aria-label="Forward 30 seconds"
            className="relative p-2 rounded-full text-slate-300 hover:text-white transition-colors"
          >
            <RotateCw size={26} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-300 pt-[2px]">30</span>
          </motion.button>

          {/* Skip next */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={playNext}
            disabled={!hasNext}
            aria-label="Next track"
            className={cn(
              'p-2 rounded-full transition-colors',
              hasNext ? 'text-slate-300 hover:text-white' : 'text-slate-700'
            )}
          >
            <SkipForward size={26} />
          </motion.button>
        </div>

        {/* Secondary controls row */}
        <div className="flex items-center justify-between px-1 mb-4">
          {/* Repeat */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleRepeat}
            aria-label={`Repeat: ${repeatMode}`}
            className={cn(
              'p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-0.5 transition-all',
              repeatMode !== 'off' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <RepeatIcon size={20} />
            <span className="text-[10px]">{repeatMode === 'one' ? 'One' : repeatMode === 'all' ? 'All' : 'Off'}</span>
          </motion.button>

          {/* Speed */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openSheet('speed')}
            aria-label="Playback speed"
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all',
              playbackSpeed !== 1
                ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
            )}
          >
            {getPlaybackSpeedLabel(playbackSpeed)}
          </motion.button>

          {/* Sleep timer */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openSheet('sleep')}
            aria-label="Sleep timer"
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all',
              sleepTimerRemaining
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
            )}
          >
            <Moon size={13} />
            <span className="font-mono">{sleepTimerRemaining ? formatSleepTimer(sleepTimerRemaining) : 'Sleep'}</span>
          </motion.button>

          {/* Volume toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowVolume(v => !v)}
            aria-label="Toggle volume"
            className={cn(
              'p-2 rounded-xl flex flex-col items-center gap-0.5 transition-all',
              showVolume ? 'text-primary bg-primary/15' : isMuted ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            <span className="text-[10px]">{isMuted ? 'Muted' : 'Vol'}</span>
          </motion.button>
        </div>

        {/* Inline volume slider */}
        <AnimatePresence>
          {showVolume && (
            <VolumeSlider
              volume={volume}
              isMuted={isMuted}
              setVolume={setVolume}
              toggleMute={toggleMute}
            />
          )}
        </AnimatePresence>

      </div>

      {/* ── Bottom sheets ── */}
      <AnimatePresence>
        {sheet && (
          <>
            <SheetBackdrop onClose={() => setSheet(null)} />
            {sheet === 'speed' && (
              <SpeedSheet speed={playbackSpeed} onSelect={setPlaybackSpeed} onClose={() => setSheet(null)} />
            )}
            {sheet === 'sleep' && (
              <SleepSheet remaining={sleepTimerRemaining} onSet={setSleepTimer} onClear={clearSleepTimer} onClose={() => setSheet(null)} />
            )}
            {sheet === 'playlist' && (
              <PlaylistSheet playlists={playlists} onSelect={handleAddToPlaylist} onClose={() => setSheet(null)} />
            )}
            {sheet === 'share' && currentTrack && (
              <ShareSheet track={currentTrack} currentPosition={position} totalDuration={duration} onClose={() => setSheet(null)} />
            )}
            {sheet === 'download' && currentTrack && (
              <DownloadSheet track={currentTrack} onClose={() => setSheet(null)} />
            )}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
