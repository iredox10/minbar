/**
 * PWAInstallBanner.tsx
 *
 * A globally-visible install prompt that slides in at the top of the screen
 * for any user who hasn't installed the PWA yet.
 *
 * - Android/Chrome: shows a one-tap install CTA using the beforeinstallprompt API
 * - iOS/Safari: shows step-by-step "Add to Home Screen" instructions in a modal sheet
 * - Already installed: never shown
 * - Dismissed: hidden for the session (stored in sessionStorage so it comes back
 *   on the next visit if they still haven't installed)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Share, Plus, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const DISMISSED_KEY = 'pwa_banner_dismissed_v1';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/** iOS-specific "Add to Home Screen" instruction sheet */
function IOSInstructionSheet({ onClose }: { onClose: () => void }) {
  return (
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
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Smartphone size={22} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Add to Home Screen</h3>
            <p className="text-xs text-slate-400">Install Arewa Central as an app</p>
          </div>
        </div>

        <ol className="space-y-4 mb-6">
          <li className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
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
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
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
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
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
  );
}

export function PWAInstallBanner() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(DISMISSED_KEY) === '1'
  );
  const [showIOSSheet, setShowIOSSheet] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Hide once the app is installed mid-session
  useEffect(() => {
    if (isInstalled) setDismissed(true);
  }, [isInstalled]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (canInstall) {
      setInstalling(true);
      await install();
      setInstalling(false);
    } else if (isIOS() && isSafari()) {
      setShowIOSSheet(true);
    }
  };

  // Decide whether to show the banner
  const shouldShow = !isInstalled && !dismissed && (canInstall || (isIOS() && isSafari()));

  return (
    <>
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            key="install-banner"
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260, delay: 1.2 }}
            className="sticky top-0 z-50 mx-0"
          >
            <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800 border-b border-slate-700/60 shadow-lg shadow-black/30">
              <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
                {/* App icon */}
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/30">
                  <Smartphone size={18} className="text-primary" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 leading-tight">
                    Install Arewa Central
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    Free Islamic Podcasts &amp; Duas — No Ads
                  </p>
                </div>

                {/* Install CTA */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-slate-900 text-xs font-bold flex-shrink-0 shadow-md shadow-primary/30 disabled:opacity-60"
                >
                  <Download size={13} className={installing ? 'animate-bounce' : ''} />
                  {installing ? 'Installing…' : isIOS() ? 'How to' : 'Install'}
                </motion.button>

                {/* Dismiss */}
                <button
                  onClick={handleDismiss}
                  aria-label="Dismiss install banner"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS instruction sheet */}
      <AnimatePresence>
        {showIOSSheet && (
          <IOSInstructionSheet onClose={() => setShowIOSSheet(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
