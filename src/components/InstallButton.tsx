import { motion } from 'framer-motion';
import { Download, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function InstallButton({ className }: { className?: string }) {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    const success = await install();
    setInstalling(false);
    
    if (!success) {
      // Show instructions for iOS
      alert(
        'To install:\n\n' +
        '1. Tap the Share button (square with arrow)\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" in the top right'
      );
    }
  };

  if (isInstalled) {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20", className)}>
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-400">App Installed</p>
          <p className="text-xs text-emerald-500/70">You're using the installed version</p>
        </div>
      </div>
    );
  }

  if (!canInstall) {
    // Show manual install instructions for iOS/Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      return (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleInstall}
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-primary/50 transition-all w-full",
            className
          )}
        >
          <Smartphone className="w-5 h-5 text-primary" />
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-slate-200">Install App</p>
            <p className="text-xs text-slate-400">Tap Share → Add to Home Screen</p>
          </div>
        </motion.button>
      );
    }

    return null;
  }

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleInstall}
      disabled={installing}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-violet-500/20 border border-primary/30 hover:border-primary/60 transition-all w-full",
        installing && "opacity-70 cursor-wait",
        className
      )}
    >
      <Download className={cn("w-5 h-5 text-primary", installing && "animate-bounce")} />
      <div className="text-left flex-1">
        <p className="text-sm font-medium text-slate-200">
          {installing ? 'Installing...' : 'Install App'}
        </p>
        <p className="text-xs text-slate-400">Add to home screen for quick access</p>
      </div>
    </motion.button>
  );
}