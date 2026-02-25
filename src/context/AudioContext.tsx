import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { audioManager } from '../lib/audio';
import { updatePlaybackProgress, isFavorite, addFavorite, removeFavorite } from '../lib/db';
import { trackPlayStart } from '../lib/analytics';
import { savePlaybackState, loadPlaybackState, clearPlaybackState, getEpisodesBySeries } from '../lib/appwrite';
import type { CurrentTrack, PlayerState, RepeatMode, QueueItem } from '../types';

interface AudioContextType {
  currentTrack: CurrentTrack | null;
  playerState: PlayerState;
  position: number;
  duration: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  sleepTimerRemaining: number | null;
  repeatMode: RepeatMode;
  queue: QueueItem[];
  currentIndex: number;
  isFavoriteTrack: boolean;
  play: (track: CurrentTrack, startPosition?: number) => Promise<void>;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (position: number) => void;
  seekRelative: (seconds: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
  stop: () => void;
  toggleRepeat: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  hasNext: boolean;
  hasPrevious: boolean;
  toggleFavorite: () => Promise<void>;
  addToPlaylistModal: () => void;
  setQueue: (items: QueueItem[], startIndex?: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

const CLOUD_SYNC_INTERVAL = 10000;

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queue, setQueueState] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isFavoriteTrack, setIsFavoriteTrack] = useState(false);

  const currentTrackRef = useRef<CurrentTrack | null>(null);
  const positionRef = useRef(0);
  const playbackSpeedRef = useRef(1);
  const repeatModeRef = useRef<RepeatMode>('off');
  const queueRef = useRef<QueueItem[]>([]);
  const currentIndexRef = useRef(-1);
  const handlingEndRef = useRef(false);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
    if (currentTrack) {
      checkFavoriteStatus(currentTrack.id, currentTrack.type);
    }
  }, [currentTrack]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const checkFavoriteStatus = async (itemId: string, type: string) => {
    if (type === 'episode' || type === 'dua') {
      const fav = await isFavorite(type as 'episode' | 'dua', itemId);
      setIsFavoriteTrack(fav);
    } else {
      setIsFavoriteTrack(false);
    }
  };

  // Load saved playback state on mount
  useEffect(() => {
    async function loadSavedState() {
      try {
        const saved = await loadPlaybackState();
        if (saved && saved.track) {
          setCurrentTrack(saved.track);
          setPosition(saved.position);
          setPlaybackSpeedState(saved.playbackSpeed);
          audioManager.setPlaybackSpeed(saved.playbackSpeed);
          setPlayerState('idle');
          
          // If track has seriesId, load the series episodes into queue
          if (saved.track.seriesId) {
            const episodes = await getEpisodesBySeries(saved.track.seriesId);
            if (episodes.length > 0) {
              const queueItems: QueueItem[] = episodes.map(ep => ({
                id: ep.$id,
                title: ep.title,
                audioUrl: ep.audioUrl,
                artworkUrl: saved.track?.artworkUrl,
                speaker: saved.track?.speaker,
                duration: ep.duration,
                type: 'episode' as const,
                seriesId: saved.track?.seriesId,
                episodeNumber: ep.episodeNumber,
              }));
              setQueueState(queueItems);
              const idx = queueItems.findIndex(item => item.id === saved.track?.id);
              setCurrentIndex(idx >= 0 ? idx : 0);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load saved playback state:', error);
      }
      setInitialized(true);
    }
    loadSavedState();
  }, []);

  // Periodic cloud sync
  useEffect(() => {
    if (!initialized) return;

    const syncInterval = setInterval(() => {
      if (currentTrackRef.current && playerState !== 'idle') {
        savePlaybackState(
          currentTrackRef.current,
          positionRef.current,
          playbackSpeedRef.current
        );
      }
    }, CLOUD_SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, [initialized, playerState]);

  // Sleep timer check
  useEffect(() => {
    const sleepTimerCheck = setInterval(() => {
      setSleepTimerRemaining(audioManager.getSleepTimerRemaining());
    }, 1000);

    return () => clearInterval(sleepTimerCheck);
  }, []);

  const playNextInternal = useCallback(async () => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    
    if (q.length === 0) return;
    
    let nextIdx = idx + 1;
    if (nextIdx >= q.length) {
      if (repeatModeRef.current === 'all') {
        nextIdx = 0;
      } else {
        return;
      }
    }
    
    const nextTrack = q[nextIdx];
    
    if (nextTrack) {
      try {
        setCurrentIndex(nextIdx);
        setCurrentTrack(nextTrack);
        setPlayerState('loading');
        await audioManager.play(nextTrack, 0);
        savePlaybackState(nextTrack, 0, playbackSpeedRef.current);
      } catch (error) {
        console.error('Failed to play next track:', error);
        setPlayerState('idle');
      }
    }
  }, []);

  const handleTrackEnd = useCallback(async () => {
    // Prevent double calls
    if (handlingEndRef.current) return;
    handlingEndRef.current = true;
    
    const track = currentTrackRef.current;
    
    if (track) {
      updatePlaybackProgress(track.id, duration, duration, true);
    }

    try {
      // Handle repeat/next
      if (repeatModeRef.current === 'one' && track) {
        // Repeat same track
        await audioManager.play(track, 0);
      } else if (repeatModeRef.current === 'all' || queueRef.current.length > 0) {
        // Play next in queue
        await playNextInternal();
      } else {
        // No repeat, clear state
        clearPlaybackState();
      }
    } catch (error) {
      console.error('Error in handleTrackEnd:', error);
    } finally {
      // Reset flag after a short delay to ensure we don't miss the next end event
      setTimeout(() => {
        handlingEndRef.current = false;
      }, 500);
    }
  }, [duration, playNextInternal]);

  // Audio manager event handlers
  useEffect(() => {
    audioManager.on({
      onStateChange: (state) => {
        setPlayerState(state);
        if (state === 'idle' && currentTrackRef.current) {
          // Track ended - handle repeat/next
          handleTrackEnd();
        }
      },
      onProgress: (pos, dur) => {
        setPosition(pos);
        setDuration(dur);
      },
      onLoad: (dur) => {
        setDuration(dur);
      },
      onEnd: () => {
        // Handled by onStateChange with 'idle'
      }
    });
  }, [handleTrackEnd]);

  // Save to cloud on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTrackRef.current && playerState !== 'idle') {
        savePlaybackState(
          currentTrackRef.current,
          positionRef.current,
          playbackSpeedRef.current
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [playerState]);

  const play = useCallback(async (track: CurrentTrack, startPosition: number = 0) => {
    try {
      if (!track.audioUrl) {
        return;
      }
      setCurrentTrack(track);
      setPlayerState('loading');
      await audioManager.play(track, startPosition);
      
      if (track.type === 'episode' || track.type === 'radio') {
        trackPlayStart(track.id, track.type, track.title);
      }

      // Save to cloud immediately when starting playback
      savePlaybackState(track, startPosition, playbackSpeedRef.current);
    } catch (error) {
      console.error('Failed to play track:', error);
      setPlayerState('idle');
    }
  }, []);

  const pause = useCallback(() => {
    audioManager.pause();
    if (currentTrack) {
      const pos = audioManager.getPosition();
      updatePlaybackProgress(currentTrack.id, pos, duration);
      savePlaybackState(currentTrack, pos, playbackSpeedRef.current);
    }
  }, [currentTrack, duration]);

  const togglePlayPause = useCallback(() => {
    if (playerState === 'playing') {
      pause();
    } else if (playerState === 'paused') {
      audioManager.togglePlayPause();
    } else if (currentTrack) {
      play(currentTrack, position);
    }
  }, [playerState, pause, currentTrack, position, play]);

  const seek = useCallback((pos: number) => {
    if (playerState === 'idle' && currentTrack) {
      setPosition(pos);
      savePlaybackState(currentTrack, pos, playbackSpeedRef.current);
    } else {
      audioManager.seek(pos);
      setPosition(pos);
      if (currentTrackRef.current) {
        savePlaybackState(currentTrackRef.current, pos, playbackSpeedRef.current);
      }
    }
  }, [playerState, currentTrack]);

  const seekRelative = useCallback((seconds: number) => {
    if (playerState === 'idle' && currentTrack) {
      const newPos = Math.max(0, Math.min(position + seconds, duration || currentTrack.duration));
      setPosition(newPos);
      savePlaybackState(currentTrack, newPos, playbackSpeedRef.current);
    } else {
      audioManager.seekRelative(seconds);
    }
  }, [playerState, currentTrack, position, duration]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    audioManager.setPlaybackSpeed(speed);
    setPlaybackSpeedState(speed);
    if (currentTrackRef.current) {
      savePlaybackState(currentTrackRef.current, positionRef.current, speed);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    audioManager.setVolume(vol);
    setVolumeState(vol);
  }, []);

  const toggleMute = useCallback(() => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const setSleepTimer = useCallback((minutes: number) => {
    audioManager.setSleepTimer(minutes);
    setSleepTimerRemaining(minutes * 60 * 1000);
  }, []);

  const clearSleepTimer = useCallback(() => {
    audioManager.clearSleepTimer();
    setSleepTimerRemaining(null);
  }, []);

  const stop = useCallback(() => {
    if (currentTrack) {
      updatePlaybackProgress(currentTrack.id, audioManager.getPosition(), duration);
    }
    audioManager.unload();
    setCurrentTrack(null);
    setPlayerState('idle');
    setPosition(0);
    setDuration(0);
    clearPlaybackState();
  }, [currentTrack, duration]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      const modes: RepeatMode[] = ['off', 'one', 'all'];
      const currentIdx = modes.indexOf(prev);
      return modes[(currentIdx + 1) % modes.length];
    });
  }, []);

  const playNext = useCallback(async () => {
    await playNextInternal();
  }, []);

  const playPrevious = useCallback(async () => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    
    if (q.length === 0) return;
    
    // If more than 3 seconds into track, restart current track
    if (positionRef.current > 3) {
      seek(0);
      return;
    }
    
    let prevIdx = idx - 1;
    if (prevIdx < 0) {
      if (repeatModeRef.current === 'all') {
        prevIdx = q.length - 1;
      } else {
        seek(0);
        return;
      }
    }
    
    const prevTrack = q[prevIdx];
    if (prevTrack) {
      setCurrentIndex(prevIdx);
      await play(prevTrack, 0);
    }
  }, [seek, play]);

  const hasNext = queue.length > 0 && (currentIndex < queue.length - 1 || repeatMode === 'all');
  const hasPrevious = queue.length > 0 && (currentIndex > 0 || repeatMode === 'all');

  const toggleFavorite = useCallback(async () => {
    if (!currentTrack) return;
    
    if (currentTrack.type === 'episode' || currentTrack.type === 'dua') {
      if (isFavoriteTrack) {
        await removeFavorite(currentTrack.type, currentTrack.id);
        setIsFavoriteTrack(false);
      } else {
        await addFavorite({
          type: currentTrack.type,
          itemId: currentTrack.id,
          title: currentTrack.title,
          imageUrl: currentTrack.artworkUrl,
          addedAt: new Date(),
        });
        setIsFavoriteTrack(true);
      }
    }
  }, [currentTrack, isFavoriteTrack]);

  const addToPlaylistModal = useCallback(async () => {
    // This will be handled by UI component - just a placeholder
    // The actual modal will be in the PlayerPage/MiniPlayer
  }, []);

  const setQueue = useCallback((items: QueueItem[], startIndex: number = 0) => {
    setQueueState(items);
    setCurrentIndex(startIndex);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        playerState,
        position,
        duration,
        playbackSpeed,
        volume,
        isMuted,
        sleepTimerRemaining,
        repeatMode,
        queue,
        currentIndex,
        isFavoriteTrack,
        play,
        pause,
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
        hasNext,
        hasPrevious,
        toggleFavorite,
        addToPlaylistModal,
        setQueue,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}