import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Trash2, CheckCircle2, AlertCircle,
  Loader2, HardDrive, Wifi
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDownload } from '../../hooks/useDownload';
import type { CurrentTrack } from '../../types';

interface DownloadSheetProps {
  track: CurrentTrack;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DownloadSheet({ track, onClose }: DownloadSheetProps) {
  const { status, progress, download, startDownload, removeDownload, errorMessage } =
    useDownload(
      track.id,
      track.audioUrl,
      track.title,
      track.seriesId,
      undefined,
      track.duration,
    );

  const isRadio = track.type === 'radio';
  const noAudio = !track.audioUrl;
  const disabled = isRadio || noAudio;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700/60 rounded-t-3xl z-10"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-slate-600" />
      </div>

      <div className="px-6 pb-8 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Download size={18} className="text-primary" />
            Download Episode
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {disabled ? (
          <div className="text-center py-6 text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-sm">
              {isRadio
                ? 'Live radio streams cannot be downloaded.'
                : 'No audio available to download.'}
            </p>
          </div>
        ) : (
          <>
            {/* Track info */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-700/40 mb-5">
              {track.artworkUrl ? (
                <img
                  src={track.artworkUrl}
                  alt={track.title}
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <HardDrive size={14} className="text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{track.title}</p>
                {track.speaker && (
                  <p className="text-xs text-slate-400 truncate">{track.speaker}</p>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* Checking */}
              {status === 'checking' && (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-6 gap-2 text-slate-400"
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Checking downloads…</span>
                </motion.div>
              )}

              {/* Idle — ready to download */}
              {status === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-700/40 border border-slate-700/60 mb-4">
                    <Wifi size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      The full episode will be saved to your device for offline listening.
                      Downloads use your current network connection.
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startDownload}
                    className="w-full py-3.5 rounded-2xl bg-primary text-slate-900 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <Download size={17} />
                    Download Episode
                  </motion.button>
                </motion.div>
              )}

              {/* Downloading — progress bar */}
              {status === 'downloading' && (
                <motion.div
                  key="downloading"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                    <span className="text-sm text-slate-300 flex-1">Downloading…</span>
                    <span className="text-xs text-primary font-mono">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-center text-slate-500">
                    Keep this screen open while downloading
                  </p>
                </motion.div>
              )}

              {/* Done */}
              {status === 'done' && download && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-emerald-300">Downloaded &amp; saved offline</p>
                      <p className="text-xs text-emerald-400/70 mt-0.5">
                        {formatBytes(download.fileSize)} •{' '}
                        {download.downloadedAt instanceof Date
                          ? download.downloadedAt.toLocaleDateString()
                          : new Date(download.downloadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={async () => { await removeDownload(); }}
                    className={cn(
                      'w-full py-3 rounded-2xl flex items-center justify-center gap-2',
                      'bg-rose-500/10 border border-rose-500/20 text-rose-400',
                      'hover:bg-rose-500/20 transition-colors font-medium text-sm'
                    )}
                  >
                    <Trash2 size={15} />
                    Remove Download
                  </button>
                </motion.div>
              )}

              {/* Error */}
              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertCircle size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-rose-300 leading-relaxed">
                      {errorMessage ?? 'Download failed. Please try again.'}
                    </p>
                  </div>
                  <button
                    onClick={startDownload}
                    className="w-full py-3 rounded-2xl bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
                  >
                    <Loader2 size={16} />
                    Retry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}
