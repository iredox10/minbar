import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle, Smartphone, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useState } from 'react';
import { cn } from '../lib/utils';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/** Inline sheet shown on iOS instead of the native prompt */
function IOSSheet({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-sm bg-slate-800 rounded-3xl p-6 border border-slate-700/60 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Smartphone size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Add to Home Screen</h3>
              <p className="text-xs text-slate-400">Install Muslim Central as an app</p>
            </div>
          </div>

          <ol className="space-y-4 mb-6">
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-sm text-slate-200">
                  Tap the <strong className="text-slate-100">Share</strong> button in Safari's toolbar
                </p>
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs">
                  <Share size={13} />
                  <span>Share</span>
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-sm text-slate-200">
                  Scroll down and tap <strong className="text-slate-100">Add to Home Screen</strong>
                </p>
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs">
                  <Plus size={13} />
                  <span>Add to Home Screen</span>
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
              <p className="text-sm text-slate-200 pt-0.5">
                Tap <strong className="text-slate-100">Add</strong> in the top-right corner
              </p>
            </li>
          </ol>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-primary text-slate-900 font-semibold text-sm"
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function InstallButton({ className }: { className?: string }) {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);

  const handleInstall = async () => {
    if (canInstall) {
      setInstalling(true);
      await install();
      setInstalling(false);
    } else if (isIOS() && isSafari()) {
      setShowIOSSheet(true);
    }
  };

  return (
    <>
      {showIOSSheet && <IOSSheet onClose={() => setShowIOSSheet(false)} />}

      {isInstalled ? (
        <div className={cn("flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20", className)}>
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-400">App Installed</p>
            <p className="text-xs text-emerald-500/70">You're using the installed version</p>
          </div>
        </div>
      ) : canInstall ? (
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
              {installing ? 'Installing…' : 'Install App'}
            </p>
            <p className="text-xs text-slate-400">Add to home screen for quick access</p>
          </div>
        </motion.button>
      ) : isIOS() && isSafari() ? (
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
      ) : null}
    </>
  );
}
