import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { audioManager } from '../lib/audio';
import { updatePlaybackProgress } from '../lib/db';
import { trackPlayStart } from '../lib/analytics';
import { savePlaybackState, loadPlaybackState, clearPlaybackState } from '../lib/appwrite';
import type { CurrentTrack, PlayerState } from '../types';

interface AudioContextType {
  currentTrack: CurrentTrack | null;
  playerState: PlayerState;
  position: number;
  duration: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  sleepTimerRemaining: number | null;
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

  const currentTrackRef = useRef<CurrentTrack | null>(null);
  const positionRef = useRef(0);
  const playbackSpeedRef = useRef(1);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

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

  // Audio manager event handlers
  useEffect(() => {
    audioManager.on({
      onStateChange: (state) => {
        setPlayerState(state);
        if (state === 'idle' && currentTrackRef.current) {
          updatePlaybackProgress(currentTrackRef.current.id, duration, duration, true);
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
        if (currentTrackRef.current) {
          updatePlaybackProgress(currentTrackRef.current.id, duration, duration, true);
          clearPlaybackState();
        }
      }
    });
  }, [duration]);

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
      // Save to cloud on pause
      savePlaybackState(currentTrack, pos, playbackSpeedRef.current);
    }
  }, [currentTrack, duration]);

  const togglePlayPause = useCallback(() => {
    if (playerState === 'playing') {
      pause();
    } else {
      audioManager.togglePlayPause();
    }
  }, [playerState, pause]);

  const seek = useCallback((pos: number) => {
    audioManager.seek(pos);
    setPosition(pos);
    // Save to cloud on seek
    if (currentTrackRef.current) {
      savePlaybackState(currentTrackRef.current, pos, playbackSpeedRef.current);
    }
  }, []);

  const seekRelative = useCallback((seconds: number) => {
    audioManager.seekRelative(seconds);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    audioManager.setPlaybackSpeed(speed);
    setPlaybackSpeedState(speed);
    // Save to cloud on speed change
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
    // Clear cloud state on stop
    clearPlaybackState();
  }, [currentTrack, duration]);

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
        stop
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