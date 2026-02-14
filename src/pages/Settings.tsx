import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun, Monitor, Timer, Wifi, Download as DownloadIcon } from 'lucide-react';
import { getSettings, updateSettings } from '../lib/db';
import { useAudio } from '../context/AudioContext';
import type { AppSettings } from '../types';
import { cn, PLAYBACK_SPEEDS, getPlaybackSpeedLabel } from '../lib/utils';

export function Settings() {
  const settings = useLiveQuery(() => getSettings());
  const { playbackSpeed, setPlaybackSpeed, sleepTimerRemaining, setSleepTimer, clearSleepTimer } = useAudio();
  const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({});

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    setLocalSettings({ ...localSettings, theme });
    await updateSettings({ theme });
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  };

  const handleSpeedChange = async (speed: number) => {
    setPlaybackSpeed(speed);
    await updateSettings({ playbackSpeed: speed });
  };

  const handleToggle = async (key: keyof AppSettings, value: boolean) => {
    setLocalSettings({ ...localSettings, [key]: value });
    await updateSettings({ [key]: value });
  };

  const sleepTimerOptions = [5, 10, 15, 30, 45, 60];

  return (
    <div className="px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Appearance</h2>
        
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-slate-300 mb-3">Theme</p>
          <div className="flex gap-2">
            {[
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
              { value: 'system', icon: Monitor, label: 'System' }
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors",
                  localSettings.theme === value
                    ? "bg-primary text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                <Icon size={16} />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Playback</h2>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-300">Playback Speed</p>
            <span className="text-sm text-primary font-medium">{getPlaybackSpeedLabel(playbackSpeed)}</span>
          </div>
          <div className="flex gap-1">
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
                  playbackSpeed === speed
                    ? "bg-primary text-slate-900"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                {getPlaybackSpeedLabel(speed)}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-300">Sleep Timer</p>
                {sleepTimerRemaining && (
                  <p className="text-xs text-primary">
                    {Math.ceil(sleepTimerRemaining / 60000)} min remaining
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {sleepTimerOptions.map((minutes) => (
              <button
                key={minutes}
                onClick={() => setSleepTimer(minutes)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                {minutes} min
              </button>
            ))}
            {sleepTimerRemaining && (
              <button
                onClick={clearSleepTimer}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Downloads</h2>
        
        <div className="glass-card rounded-xl divide-y divide-slate-800">
          <label className="flex items-center justify-between p-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-300">Download on Wi-Fi only</p>
                <p className="text-xs text-slate-500">Save mobile data</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.downloadWifiOnly ?? true}
              onChange={(e) => handleToggle('downloadWifiOnly', e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary/50"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <DownloadIcon className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-300">Auto-download new episodes</p>
                <p className="text-xs text-slate-500">From subscribed series</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.autoDownload ?? false}
              onChange={(e) => handleToggle('autoDownload', e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary/50"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">About</h2>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">MC</span>
            </div>
            <div>
              <p className="font-medium text-slate-100">Muslim Central</p>
              <p className="text-xs text-slate-500">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Audio Podcasts and more. Free. No Ads. Your Daily Muslim Companion.
          </p>
        </div>
      </section>
    </div>
  );
}