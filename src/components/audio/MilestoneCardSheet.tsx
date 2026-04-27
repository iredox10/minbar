import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Download, Share2, X, Loader2, Trophy, QrCode } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { ShareCard } from '../share/ShareCard';
import { getRecentHistory } from '../../lib/db';
import type { PlaybackHistory } from '../../types';
import { toast } from 'sonner';

interface MilestoneCardSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MilestoneData {
  title: string;
  subtitle: string;
  description?: string;
  badge?: string;
  icon: string;
}

export function MilestoneCardSheet({ isOpen, onClose }: MilestoneCardSheetProps) {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeQR, setIncludeQR] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl = window.location.origin;

  const loadMilestones = async () => {
    setLoading(true);
    try {
      const history = await getRecentHistory(200);
      const now = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      
      const weekHistory = history.filter((h: PlaybackHistory) => now - new Date(h.playedAt).getTime() < weekMs);
      const totalMinutes = Math.round(weekHistory.reduce((acc: number, h: PlaybackHistory) => acc + Math.min(h.position, h.duration) / 60, 0));
      const completedCount = weekHistory.filter((h: PlaybackHistory) => h.completed).length;
      const uniqueEpisodes = new Set(weekHistory.map((h: PlaybackHistory) => h.episodeId)).size;

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      const newMilestones: MilestoneData[] = [
        {
          title: `${hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} this week`,
          subtitle: 'Listening Time',
          description: `Listened to ${uniqueEpisodes} episodes`,
          badge: 'Weekly Stats',
          icon: '⏱️'
        },
        {
          title: `${completedCount} episodes`,
          subtitle: 'Completed this week',
          badge: 'Achievement',
          icon: '✅'
        },
        {
          title: `${uniqueEpisodes} unique episodes`,
          subtitle: 'Explored this week',
          badge: 'Discovery',
          icon: '🎧'
        }
      ];

      if (totalMinutes >= 60) {
        newMilestones.push({
          title: `${hours}+ hours`,
          subtitle: 'Knowledge Seeker',
          description: 'You\'re on fire this week!',
          badge: 'Milestone',
          icon: '🔥'
        });
      }

      setMilestones(newMilestones);
    } catch (error) {
      console.error('Failed to load milestones:', error);
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = useCallback(async (milestone: MilestoneData) => {
    setSelectedMilestone(milestone);
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
      console.error('Failed to generate milestone card:', error);
      toast.error('Failed to generate card');
    } finally {
      setGenerating(false);
    }
  }, [includeQR]);

  const handleDownload = async () => {
    if (!previewUrl) return;
    
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const filename = `arewa-milestone-${Date.now()}.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Milestone card downloaded');
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
      const text = selectedMilestone ? `My ${selectedMilestone.subtitle}: ${selectedMilestone.title}` : 'My Arewa Central Stats';
      
      try {
        const file = new File([blob], 'arewa-milestone.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Arewa Central Stats',
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
    setPreviewUrl(null);
    setSelectedMilestone(null);
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
                  <Trophy size={20} className="text-amber-400" />
                  Share Milestone
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="text-primary animate-spin" />
                </div>
              ) : !previewUrl ? (
                <div className="space-y-3">
                  {milestones.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 size={48} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No milestones yet</p>
                      <p className="text-sm text-slate-500 mt-1">Start listening to earn milestones</p>
                      <button
                        onClick={loadMilestones}
                        className="mt-4 px-6 py-2 bg-primary text-slate-900 rounded-lg font-medium text-sm"
                      >
                        Refresh Stats
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
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
                      <p className="text-sm text-slate-400 mb-2">Select a milestone to share:</p>
                      {milestones.map((m, i) => (
                        <button
                          key={i}
                          onClick={() => handleGenerate(m)}
                          disabled={generating}
                          className="w-full p-4 bg-slate-800/50 rounded-2xl flex items-center gap-4 hover:bg-slate-700/50 transition-colors disabled:opacity-50 text-left"
                        >
                          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-100">{m.title}</p>
                            <p className="text-sm text-slate-400">{m.subtitle}</p>
                            {m.badge && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                                {m.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {previewUrl && (
                    <div className="rounded-2xl overflow-hidden bg-slate-800">
                      <img src={previewUrl} alt="Milestone card preview" className="w-full" />
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
                    ← Choose another milestone
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Hidden card for capture */}
          <div className="fixed left-0 top-0 -z-50 opacity-0 pointer-events-none" style={{ width: '540px' }}>
            <div ref={cardRef} className="scale-[0.5] origin-top-left" style={{ width: '1080px', height: '1080px' }}>
              <ShareCard
                type="milestone"
                title={selectedMilestone?.title || 'Your Stats'}
                subtitle={selectedMilestone?.subtitle}
                description={selectedMilestone?.description}
                accentColor="#10b981"
                badge={selectedMilestone?.badge}
                footer="Track your progress on Arewa Central"
                qrUrl={includeQR ? shareUrl : undefined}
              />
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
