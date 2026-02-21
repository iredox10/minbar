import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { audioManager } from '../lib/audio';
import { updatePlaybackProgress } from '../lib/db';
import { trackPlayStart } from '../lib/analytics';
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

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  useEffect(() => {
    const sleepTimerCheck = setInterval(() => {
      setSleepTimerRemaining(audioManager.getSleepTimerRemaining());
    }, 1000);

    return () => clearInterval(sleepTimerCheck);
  }, []);

  useEffect(() => {
    audioManager.on({
      onStateChange: (state) => {
        setPlayerState(state);
        if (state === 'idle' && currentTrack) {
          updatePlaybackProgress(currentTrack.id, duration, duration, true);
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
        if (currentTrack) {
          updatePlaybackProgress(currentTrack.id, duration, duration, true);
        }
      }
    });
  }, [currentTrack, duration]);

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
    } catch (error) {
      console.error('Failed to play track:', error);
      setPlayerState('idle');
    }
  }, []);

  const pause = useCallback(() => {
    audioManager.pause();
    if (currentTrack) {
      updatePlaybackProgress(currentTrack.id, audioManager.getPosition(), duration);
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
  }, []);

  const seekRelative = useCallback((seconds: number) => {
    audioManager.seekRelative(seconds);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    audioManager.setPlaybackSpeed(speed);
    setPlaybackSpeedState(speed);
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