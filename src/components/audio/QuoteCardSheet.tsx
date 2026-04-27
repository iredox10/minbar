import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Download, Share2, X, Loader2, QrCode } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { ShareCard } from '../share/ShareCard';
import { toast } from 'sonner';

interface QuoteCardSheetProps {
  episodeTitle?: string;
  speakerName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuoteCardSheet({ episodeTitle, speakerName, isOpen, onClose }: QuoteCardSheetProps) {
  const [quote, setQuote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [includeQR, setIncludeQR] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl = window.location.origin;

  const handleGenerate = useCallback(async () => {
    if (!quote.trim()) {
      toast.error('Please enter a quote');
      return;
    }

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
    } catch (error) {
      console.error('Failed to generate quote card:', error);
      toast.error('Failed to generate quote card');
    } finally {
      setGenerating(false);
    }
  }, [quote, speakerName, episodeTitle, includeQR]);

  const handleDownload = async () => {
    if (!previewUrl) return;
    
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const filename = `arewa-quote-${Date.now()}.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Quote card downloaded');
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
      const text = speakerName ? `"${quote}" — ${speakerName}` : `"${quote}"`;
      
      try {
        const file = new File([blob], 'arewa-quote.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Arewa Central Quote',
            text
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

  const handleReset = () => {
    setQuote('');
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
                  <Quote size={20} className="text-emerald-400" />
                  Create Quote Card
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {!previewUrl ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Quote or Lesson</label>
                    <textarea
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      placeholder="Enter a powerful quote or lesson from this episode..."
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>

                  {episodeTitle && (
                    <p className="text-xs text-slate-500">
                      From: {episodeTitle}{speakerName ? ` by ${speakerName}` : ''}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={includeQR}
                        onChange={(e) => setIncludeQR(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <QrCode size={14} />
                      Include QR code
                    </label>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={generating || !quote.trim()}
                    className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Quote size={18} />
                        Generate Quote Card
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {previewUrl && (
                    <div className="rounded-2xl overflow-hidden bg-slate-800">
                      <img src={previewUrl} alt="Quote card preview" className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-3 bg-slate-800 text-slate-200 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                    >
                      <Download size={18} />
                      Save
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                    >
                      <Share2 size={18} />
                      Share
                    </button>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full py-3 text-slate-400 text-sm hover:text-slate-200 transition-colors"
                  >
                    ← Create another quote card
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Hidden card for capture */}
          <div className="fixed left-0 top-0 -z-50 opacity-0 pointer-events-none" style={{ width: '540px' }}>
            <div ref={cardRef} className="scale-[0.5] origin-top-left" style={{ width: '1080px', height: '1080px' }}>
              <ShareCard
                type="quote"
                title={quote || 'Your quote here'}
                subtitle={speakerName || episodeTitle}
                accentColor="#10b981"
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
