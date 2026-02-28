import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, Timer, Wifi, Download as DownloadIcon, Sparkles, Zap, Sliders } from 'lucide-react';
import { getSettings, updateSettings } from '../lib/db';
import { useAudio } from '../context/AudioContext';
import { InstallButton } from '../components/InstallButton';
import type { AppSettings } from '../types';
import { cn, PLAYBACK_SPEEDS, getPlaybackSpeedLabel } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const defaultSettings: AppSettings = {
  theme: 'dark',
  playbackSpeed: 1,
  downloadWifiOnly: true,
  autoDownload: false
};

export function Settings() {
  const rawSettings = useLiveQuery(() => getSettings());
  const { playbackSpeed, setPlaybackSpeed, sleepTimerRemaining, setSleepTimer, clearSleepTimer } = useAudio();
  const [initialized, setInitialized] = useState(false);

  const settings = rawSettings || defaultSettings;

  useEffect(() => {
    if (!rawSettings && !initialized) {
      updateSettings({}).then(() => setInitialized(true));
    } else if (rawSettings) {
      setInitialized(true);
    }
  }, [rawSettings, initialized]);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await updateSettings({ theme });
    localStorage.setItem('arewa-theme', theme);

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
    await updateSettings({ [key]: value });
  };

  const sleepTimerOptions = [5, 10, 15, 30, 45, 60];

  return (
    <div className="min-h-screen px-4 py-6 space-y-8 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-4"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 mb-4">
          <Sliders className="w-8 h-8 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Customize your experience</p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Install PWA */}
        <motion.section variants={item}>
          <InstallButton />
        </motion.section>

        {/* Appearance */}
        <motion.section variants={item} className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Appearance</h2>
          
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-slate-300 mb-4 font-medium">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' }
              ].map(({ value, icon: Icon, label }) => (
                <motion.button
                  key={value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-xl transition-all",
                    settings.theme === value
                      ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                      : "bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Playback */}
        <motion.section variants={item} className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Playback</h2>
          
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-200 font-medium">Playback Speed</p>
                  <p className="text-xs text-slate-500">Current: {getPlaybackSpeedLabel(playbackSpeed)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1.5">
              {PLAYBACK_SPEEDS.map((speed) => (
                <motion.button
                  key={speed}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSpeedChange(speed)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all",
                    playbackSpeed === speed
                      ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  )}
                >
                  {getPlaybackSpeedLabel(speed)}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "p-2 rounded-xl transition-colors",
                sleepTimerRemaining ? "bg-violet-500/20" : "bg-slate-800"
              )}>
                <Timer className={cn(
                  "w-5 h-5 transition-colors",
                  sleepTimerRemaining ? "text-violet-400" : "text-slate-400"
                )} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-200 font-medium">Sleep Timer</p>
                {sleepTimerRemaining && (
                  <p className="text-xs text-violet-400 font-medium">
                    {Math.ceil(sleepTimerRemaining / 60000)} min remaining
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {sleepTimerOptions.map((minutes) => (
                <motion.button
                  key={minutes}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSleepTimer(minutes)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {minutes} min
                </motion.button>
              ))}
              
              {sleepTimerRemaining && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearSleepTimer}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                >
                  Cancel
                </motion.button>
              )}
            </div>
          </div>
        </motion.section>

        {/* Downloads */}
        <motion.section variants={item} className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Downloads</h2>
          
          <div className="glass-card rounded-2xl divide-y divide-slate-800">
            <label className="flex items-center justify-between p-4 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors">
                  <Wifi className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-200 font-medium">Wi-Fi only</p>
                  <p className="text-xs text-slate-500">Save mobile data</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.downloadWifiOnly ?? true}
                  onChange={(e) => handleToggle('downloadWifiOnly', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
            
            <label className="flex items-center justify-between p-4 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors">
                  <DownloadIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-200 font-medium">Auto-download</p>
                  <p className="text-xs text-slate-500">New episodes from subscriptions</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.autoDownload ?? false}
                  onChange={(e) => handleToggle('autoDownload', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </motion.section>

        {/* About */}
        <motion.section variants={item} className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">About</h2>
          
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-primary/20">
                <img src="/logo.svg" alt="Arewa Central" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-slate-100 text-lg">Arewa Central</p>
                <p className="text-xs text-slate-500">Version 1.0.0</p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Sparkles size={16} />
                <span className="text-sm font-medium">Free. No Ads. No Tracking.</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your daily companion for audio podcasts, lectures, duas, and more. 
                Designed to help you stay connected with beneficial knowledge.
              </p>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}