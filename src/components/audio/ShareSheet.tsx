import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Share2, Play, Pause, Loader2, CheckCircle2,
  AlertCircle, Download, Copy, Scissors
} from 'lucide-react';
import { generateAudioClip, buildShareCaption } from '../../lib/audioClip';
import { formatDuration, cn } from '../../lib/utils';
import { toast } from 'sonner';
import type { CurrentTrack } from '../../types';

type Status = 'idle' | 'generating' | 'ready' | 'error';

interface ShareSheetProps {
  track: CurrentTrack;
  currentPosition: number; // seconds
  totalDuration: number;   // seconds
  onClose: () => void;
}

const MAX_CLIP_SEC = 60;

export function ShareSheet({ track, currentPosition, totalDuration, onClose }: ShareSheetProps) {
  // Clamp start so the 60s window fits within the track
  const maxStart = Math.max(0, totalDuration - MAX_CLIP_SEC);
  const defaultStart = Math.min(Math.max(0, currentPosition), maxStart);
  const clipDuration = Math.min(MAX_CLIP_SEC, totalDuration);

  const [startSec, setStartSec] = useState(defaultStart);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [clipBlob, setClipBlob] = useState<Blob | null>(null);
  const [clipFilename, setClipFilename] = useState('');
  const [actualDuration, setActualDuration] = useState(clipDuration);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const endSec = Math.min(startSec + MAX_CLIP_SEC, totalDuration);
  const displayClipDuration = endSec - startSec;

  const caption = buildShareCaption({
    title: track.title,
    speaker: track.speaker,
    startSec,
    durationSec: displayClipDuration,
  });

  // Clean up preview audio URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewAudioRef.current?.pause();
    };
  }, []);

  // Reset clip when slider moves
  const handleStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setStartSec(val);
    // Invalidate any previously generated clip
    if (clipBlob) {
      setClipBlob(null);
      setStatus('idle');
      setProgress(0);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setIsPreviewing(false);
      previewAudioRef.current?.pause();
    }
  }, [clipBlob]);

  const handleGenerate = useCallback(async () => {
    setStatus('generating');
    setProgress(0);
    setClipBlob(null);

    try {
      const result = await generateAudioClip({
        audioUrl: track.audioUrl,
        startSec,
        durationSec: MAX_CLIP_SEC,
        onProgress: setProgress,
      });

      // Create object URL for preview
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = URL.createObjectURL(result.blob);

      setClipBlob(result.blob);
      setClipFilename(result.filename);
      setActualDuration(result.actualDurationSec);
      setStatus('ready');
    } catch (err) {
      console.error('Clip generation failed:', err);
      setStatus('error');
    }
  }, [track.audioUrl, startSec]);

  const handlePreview = useCallback(() => {
    if (!previewUrlRef.current) return;

    if (isPreviewing) {
      previewAudioRef.current?.pause();
      setIsPreviewing(false);
      return;
    }

    const audio = new Audio(previewUrlRef.current);
    previewAudioRef.current = audio;
    audio.play();
    setIsPreviewing(true);
    audio.onended = () => setIsPreviewing(false);
    audio.onerror = () => setIsPreviewing(false);
  }, [isPreviewing]);

  const handleShare = useCallback(async () => {
    if (!clipBlob) return;

    const file = new File([clipBlob], clipFilename, { type: 'audio/wav' });

    // Try native file share (WhatsApp, Telegram, etc.)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: caption,
        });
        return;
      } catch (err) {
        // User cancelled or browser blocked — fall through to fallback
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: share text only (link + caption)
    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          text: caption,
          url: window.location.origin,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Desktop fallback: download WAV + copy text
    handleDownload();
    await handleCopyCaption();
  }, [clipBlob, clipFilename, caption, track.title]);

  const handleDownload = useCallback(() => {
    if (!clipBlob) return;
    const url = URL.createObjectURL(clipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = clipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success('Clip downloaded');
  }, [clipBlob, clipFilename]);

  const handleCopyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [caption]);

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
      style={{ maxHeight: '85vh', overflowY: 'auto' }}
    >
      {/* Handle bar */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-slate-600" />
      </div>

      <div className="px-6 pb-8 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Share2 size={18} className="text-primary" />
            Share Clip
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
              {isRadio ? 'Live radio streams cannot be clipped.' : 'No audio available to clip.'}
            </p>
          </div>
        ) : (
          <>
            {/* Track info */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-700/40 mb-5">
              {track.artworkUrl ? (
                <img src={track.artworkUrl} alt={track.title} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Scissors size={14} className="text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{track.title}</p>
                {track.speaker && <p className="text-xs text-slate-400 truncate">{track.speaker}</p>}
              </div>
            </div>

            {/* Range selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  60-Second Window
                </span>
                <span className="text-xs text-primary font-mono">
                  {formatDuration(startSec)} – {formatDuration(endSec)}
                </span>
              </div>

              {/* Progress track visualisation */}
              <div className="relative mb-3">
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  {/* Full track background */}
                  <div className="absolute inset-0 rounded-full bg-slate-700" />
                  {/* Clip window highlight */}
                  {totalDuration > 0 && (
                    <div
                      className="absolute top-0 h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                      style={{
                        left: `${(startSec / totalDuration) * 100}%`,
                        width: `${(displayClipDuration / totalDuration) * 100}%`,
                      }}
                    />
                  )}
                </div>
                {/* Thumb label */}
                {totalDuration > 0 && (
                  <div
                    className="absolute -top-5 text-[10px] font-mono text-primary"
                    style={{
                      left: `clamp(0px, calc(${(startSec / totalDuration) * 100}% - 12px), calc(100% - 32px))`,
                    }}
                  >
                    {formatDuration(startSec)}
                  </div>
                )}
              </div>

              {/* Slider input */}
              <input
                type="range"
                min={0}
                max={Math.max(0, maxStart)}
                step={1}
                value={startSec}
                onChange={handleStartChange}
                disabled={maxStart <= 0}
                className="w-full accent-primary cursor-pointer h-1"
              />

              <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                <span>0:00</span>
                <span className="text-slate-400">
                  Clip: {Math.round(displayClipDuration)}s
                </span>
                <span>{totalDuration > 0 ? formatDuration(totalDuration) : '--:--'}</span>
              </div>
            </div>

            {/* Generate button / status */}
            <AnimatePresence mode="wait">
              {status === 'idle' && (
                <motion.button
                  key="generate"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  className="w-full py-3.5 rounded-2xl bg-primary text-slate-900 font-semibold flex items-center justify-center gap-2 mb-4 shadow-lg shadow-primary/20"
                >
                  <Scissors size={17} />
                  Generate Clip
                </motion.button>
              )}

              {status === 'generating' && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                    <span className="text-sm text-slate-300 flex-1">
                      {progress < 40 ? 'Fetching audio…'
                        : progress < 70 ? 'Decoding…'
                        : progress < 90 ? 'Slicing clip…'
                        : 'Encoding WAV…'}
                    </span>
                    <span className="text-xs text-primary font-mono">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 mb-3">
                    <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                    <p className="text-sm text-rose-300 flex-1">
                      Failed to generate clip. This may be a CORS or network issue.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="w-full py-3 rounded-2xl bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-2"
                  >
                    <Loader2 size={16} />
                    Retry
                  </button>
                </motion.div>
              )}

              {status === 'ready' && clipBlob && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 space-y-3"
                >
                  {/* Success badge */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-emerald-300 flex-1">
                      Clip ready — {Math.round(actualDuration)}s • {(clipBlob.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    {/* Re-generate (different window) */}
                    <button
                      onClick={() => { setStatus('idle'); setClipBlob(null); setProgress(0); }}
                      className="text-xs text-slate-400 hover:text-slate-200 underline ml-1"
                    >
                      Redo
                    </button>
                  </div>

                  {/* Preview button */}
                  <button
                    onClick={handlePreview}
                    className={cn(
                      'w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-medium text-sm transition-all',
                      isPreviewing
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    )}
                  >
                    {isPreviewing ? <><Pause size={16} /> Stop Preview</> : <><Play size={16} /> Preview Clip</>}
                  </button>

                  {/* Primary share button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="w-full py-3.5 rounded-2xl bg-primary text-slate-900 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <Share2 size={17} />
                    Share to WhatsApp / Social
                  </motion.button>

                  {/* Secondary actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleDownload}
                      className="py-3 rounded-2xl bg-slate-700 text-slate-200 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
                    >
                      <Download size={15} />
                      Download
                    </button>
                    <button
                      onClick={handleCopyCaption}
                      className="py-3 rounded-2xl bg-slate-700 text-slate-200 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
                    >
                      <Copy size={15} />
                      Copy Text
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Caption preview */}
            <div className="rounded-2xl bg-slate-700/40 border border-slate-700/60 overflow-hidden">
              <button
                onClick={() => setCaptionExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="font-medium">Share caption preview</span>
                <motion.span
                  animate={{ rotate: captionExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-500"
                >
                  ▾
                </motion.span>
              </button>
              <AnimatePresence>
                {captionExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <pre className="px-4 pb-4 text-xs text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
                      {caption}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
