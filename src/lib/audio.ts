import { Howl, Howler } from 'howler';
import type { CurrentTrack, PlayerState } from '../types';

type AudioEventCallback = () => void;
type AudioProgressCallback = (position: number, duration: number) => void;
type AudioLoadCallback = (duration: number) => void;
type AudioErrorCallback = (error: unknown) => void;

interface AudioEventListeners {
  onPlay?: AudioEventCallback;
  onPause?: AudioEventCallback;
  onEnd?: AudioEventCallback;
  onProgress?: AudioProgressCallback;
  onLoad?: AudioLoadCallback;
  onError?: AudioErrorCallback;
  onStateChange?: (state: PlayerState) => void;
}

class AudioManager {
  private currentHowl: Howl | null = null;
  private currentTrack: CurrentTrack | null = null;
  private listeners: AudioEventListeners = {};
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private _playbackSpeed: number = 1;
  private _volume: number = 1;
  private _muted: boolean = false;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private sleepTimerEndTime: number | null = null;

  constructor() {
    this.setupMediaSession();
  }

  private setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.seekRelative(-30));
      navigator.mediaSession.setActionHandler('nexttrack', () => this.seekRelative(30));
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.seekRelative(-skipTime);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.seekRelative(skipTime);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    }
  }

  private updateMediaSession() {
    if ('mediaSession' in navigator && this.currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTrack.title,
        artist: this.currentTrack.speaker || 'Muslim Central',
        artwork: this.currentTrack.artworkUrl
          ? [{ src: this.currentTrack.artworkUrl, sizes: '512x512', type: 'image/png' }]
          : []
      });
    }
  }

  private startProgressTracking() {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (this.currentHowl) {
        const position = this.currentHowl.seek() as number;
        const duration = this.currentHowl.duration();
        this.listeners.onProgress?.(position, duration);
      }
    }, 100);
  }

  private stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private handleLoad = () => {
    const duration = this.currentHowl?.duration() || 0;
    this.listeners.onLoad?.(duration);
    this.updateMediaSession();
  };

  private handlePlay = () => {
    this.listeners.onStateChange?.('playing');
    this.listeners.onPlay?.();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    this.startProgressTracking();
  };

  private handlePause = () => {
    this.listeners.onStateChange?.('paused');
    this.listeners.onPause?.();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    this.stopProgressTracking();
  };

  private handleEnd = () => {
    this.listeners.onStateChange?.('idle');
    this.listeners.onEnd?.();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    this.stopProgressTracking();
  };

  private handleError = (_id: number, error: unknown) => {
    console.error('Howler error:', error);
    this.listeners.onStateChange?.('idle');
    this.listeners.onError?.(error);
  };

  load(track: CurrentTrack, startPosition: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      this.unload();
      
      if (!track.audioUrl) {
        this.listeners.onStateChange?.('idle');
        reject(new Error('No audio URL provided'));
        return;
      }
      
      this.currentTrack = track;
      this.listeners.onStateChange?.('loading');
      
      const audioUrl = track.audioUrl;
      const extension = audioUrl.split('.').pop()?.toLowerCase().split('?')[0] || 'mp3';
      const format = ['mp3', 'mpeg', 'wav', 'ogg', 'm4a', 'webm', 'aac'].includes(extension) 
        ? extension 
        : 'mp3';

      this.currentHowl = new Howl({
        src: [audioUrl],
        format: [format],
        html5: true,
        preload: true,
        volume: this._volume,
        rate: this._playbackSpeed,
        mute: this._muted,
        onload: () => {
          this.handleLoad();
          if (startPosition > 0) {
            this.currentHowl?.seek(startPosition);
          }
          resolve();
        },
        onplay: this.handlePlay,
        onpause: this.handlePause,
        onend: this.handleEnd,
        onplayerror: (id, error) => {
          console.error('AudioManager: Play error:', error);
          this.handleError(id, error);
          reject(error);
        },
        onloaderror: (id, error) => {
          console.error('AudioManager: Load error:', error);
          this.handleError(id, error);
          reject(error);
        }
      });
    });
  }

  unload() {
    this.stopProgressTracking();
    if (this.currentHowl) {
      this.currentHowl.unload();
      this.currentHowl = null;
    }
    this.currentTrack = null;
  }

  async play(track?: CurrentTrack, startPosition: number = 0): Promise<void> {
    if (track) {
      await this.load(track, startPosition);
    }
    
    if (this.currentHowl) {
      this.currentHowl.play();
    }
  }

  pause() {
    if (this.currentHowl) {
      this.currentHowl.pause();
    }
  }

  togglePlayPause() {
    if (!this.currentHowl) return;
    
    if (this.currentHowl.playing()) {
      this.pause();
    } else {
      this.currentHowl.play();
    }
  }

  seek(position: number) {
    if (this.currentHowl) {
      this.currentHowl.seek(position);
      this.listeners.onProgress?.(position, this.currentHowl.duration());
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setPositionState({
          duration: this.currentHowl.duration(),
          position: Math.min(position, this.currentHowl.duration()),
          playbackRate: this._playbackSpeed
        });
      }
    }
  }

  seekRelative(seconds: number) {
    if (this.currentHowl) {
      const currentPos = this.currentHowl.seek() as number;
      const duration = this.currentHowl.duration();
      const newPos = Math.max(0, Math.min(currentPos + seconds, duration));
      this.seek(newPos);
    }
  }

  setPlaybackSpeed(speed: number) {
    this._playbackSpeed = speed;
    if (this.currentHowl) {
      this.currentHowl.rate(speed);
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setPositionState({
        duration: this.currentHowl?.duration() || 0,
        position: this.getPosition(),
        playbackRate: speed
      });
    }
  }

  getPlaybackSpeed(): number {
    return this._playbackSpeed;
  }

  setVolume(volume: number) {
    this._volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this._volume);
  }

  getVolume(): number {
    return this._volume;
  }

  mute() {
    this._muted = true;
    Howler.mute(true);
  }

  unmute() {
    this._muted = false;
    Howler.mute(false);
  }

  toggleMute(): boolean {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this._muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  getPosition(): number {
    if (this.currentHowl) {
      return this.currentHowl.seek() as number;
    }
    return 0;
  }

  getDuration(): number {
    if (this.currentHowl) {
      return this.currentHowl.duration();
    }
    return 0;
  }

  isPlaying(): boolean {
    return this.currentHowl?.playing() || false;
  }

  getCurrentTrack(): CurrentTrack | null {
    return this.currentTrack;
  }

  setSleepTimer(minutes: number) {
    this.clearSleepTimer();
    this.sleepTimerEndTime = Date.now() + minutes * 60 * 1000;
    this.sleepTimer = setTimeout(() => {
      this.pause();
      this.sleepTimerEndTime = null;
    }, minutes * 60 * 1000);
  }

  clearSleepTimer() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
    this.sleepTimerEndTime = null;
  }

  getSleepTimerRemaining(): number | null {
    if (!this.sleepTimerEndTime) return null;
    const remaining = this.sleepTimerEndTime - Date.now();
    return remaining > 0 ? remaining : null;
  }

  on(listeners: AudioEventListeners) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  off(event: keyof AudioEventListeners) {
    delete this.listeners[event];
  }
}

export const audioManager = new AudioManager();
export type { AudioEventListeners };