import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, Image, X, Loader2, QrCode } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { ShareCard } from '../share/ShareCard';
import type { Episode } from '../../types';
import { toast } from 'sonner';

interface ShareSheetProps {
  episode: Episode;
  speakerName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSheet({ episode, speakerName, isOpen, onClose }: ShareSheetProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [includeQR, setIncludeQR] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl = `${window.location.origin}/podcasts/episode/${episode.$id}`;

  const handleGenerateCard = useCallback(async () => {
    setGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!cardRef.current) throw new Error('Card ref not available');

      const blob = await toBlob(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
      });

      if (!blob) throw new Error('Failed to generate image');

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setGenerated(true);
    } catch (error) {
      console.error('Failed to generate share card:', error);
      toast.error('Failed to generate share card');
    } finally {
      setGenerating(false);
    }
  }, [episode.$id, speakerName, includeQR]);

  const handleDownload = async () => {
    if (!previewUrl) return;
    
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const filename = `${episode.title.replace(/[^a-zA-Z0-9]/g, '_')}_share.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Failed to download:', error);
      toast.error('Failed to download image');
    }
  };

  const handleShare = async () => {
    if (!previewUrl) return;
    
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      
      try {
        const file = new File([blob], 'arewa-central-share.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: episode.title,
            text: `Listen to "${episode.title}" on Arewa Central`
          });
          toast.success('Shared successfully');
          return;
        }
      } catch {
        // Fall through to download
      }

      await handleDownload();
    } catch (error) {
      console.error('Failed to share:', error);
      await handleDownload();
    }
  };

  const handleShareLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: episode.title,
          text: `Listen to "${episode.title}" on Arewa Central`,
          url: shareUrl
        });
        toast.success('Shared successfully');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    }
  };

  const handleReset = () => {
    setGenerated(false);
    setPreviewUrl(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto my-4" />
            
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Share2 size={20} className="text-primary" />
                  Share Episode
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {!generated ? (
                <div className="space-y-3">
                  <button
                    onClick={handleGenerateCard}
                    disabled={generating}
                    className="w-full p-4 bg-slate-800/50 rounded-2xl flex items-center gap-4 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      {generating ? (
                        <Loader2 size={24} className="text-primary animate-spin" />
                      ) : (
                        <Image size={24} className="text-primary" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-slate-100">
                        {generating ? 'Generating...' : 'Create Share Card'}
                      </p>
                      <p className="text-sm text-slate-400">Beautiful image with episode artwork</p>
                    </div>
                    <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={includeQR}
                        onChange={(e) => setIncludeQR(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <QrCode size={16} className="text-slate-400" />
                    </label>
                  </button>

                  <button
                    onClick={handleShareLink}
                    className="w-full p-4 bg-slate-800/50 rounded-2xl flex items-center gap-4 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                      <Share2 size={24} className="text-sky-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-100">Share Link</p>
                      <p className="text-sm text-slate-400">Share episode link directly</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {previewUrl && (
                    <div className="rounded-2xl overflow-hidden bg-slate-800">
                      <img src={previewUrl} alt="Share card preview" className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-3 bg-slate-800 text-slate-200 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                    >
                      <Download size={18} />
                      Save Image
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex-1 py-3 bg-primary text-slate-900 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-light transition-colors"
                    >
                      <Share2 size={18} />
                      Share
                    </button>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full py-3 text-slate-400 text-sm hover:text-slate-200 transition-colors"
                  >
                    ← Back to options
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Hidden card for capture */}
          <div className="fixed left-0 top-0 -z-50 opacity-0 pointer-events-none" style={{ width: '540px' }}>
            <div ref={cardRef} className="scale-[0.5] origin-top-left" style={{ width: '1080px', height: '1080px' }}>
              <ShareCard
                type="episode"
                title={episode.title}
                subtitle={speakerName}
                imageUrl="/logo.svg"
                accentColor="#10b981"
                badge={`Episode ${episode.episodeNumber || ''}`}
                footer="Listen on Arewa Central — Free. No Ads."
                qrUrl={includeQR ? shareUrl : undefined}
              />
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
