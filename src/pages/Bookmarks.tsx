import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark as BookmarkIcon,
  Play,
  Trash2,
  Music2,
  Clock,
} from 'lucide-react';
import { getBookmarks, deleteBookmark } from '../lib/db';
import { useAudio } from '../context/AudioContext';
import type { Bookmark } from '../types';
import { formatDuration, cn } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export function Bookmarks() {
  const navigate = useNavigate();
  const { play, currentTrack } = useAudio();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await getBookmarks();
    setBookmarks(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResume = async (bm: Bookmark) => {
    await play(
      {
        id: bm.episodeId,
        title: bm.episodeTitle,
        audioUrl: bm.audioUrl,
        artworkUrl: bm.artworkUrl,
        speaker: bm.speakerName,
        type: 'episode',
        duration: 0,
      },
      bm.position,
    );
    navigate('/player');
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await deleteBookmark(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
    setDeletingId(null);
  };

  // Group bookmarks by episodeId
  const grouped = bookmarks.reduce<Record<string, Bookmark[]>>((acc, bm) => {
    if (!acc[bm.episodeId]) acc[bm.episodeId] = [];
    acc[bm.episodeId].push(bm);
    return acc;
  }, {});

  const groups = Object.entries(grouped);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern opacity-30" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative px-4 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-1"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <BookmarkIcon size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Bookmarks</h1>
              <p className="text-xs text-slate-500">
                {bookmarks.length === 0
                  ? 'No bookmarks yet'
                  : `${bookmarks.length} saved position${bookmarks.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-24">
        {loading ? (
          <div className="space-y-4 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-slate-800/70 flex items-center justify-center mb-5">
              <BookmarkIcon size={32} className="text-slate-600" />
            </div>
            <p className="text-slate-300 font-semibold text-lg mb-2">No bookmarks yet</p>
            <p className="text-slate-500 text-sm max-w-xs">
              Tap the bookmark icon in the player to save your position in any episode.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6 mt-2"
          >
            {groups.map(([episodeId, bms]) => {
              const first = bms[0];
              const isCurrentEpisode = currentTrack?.id === episodeId;
              return (
                <motion.section key={episodeId} variants={item}>
                  {/* Episode header */}
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-slate-800">
                      {first.artworkUrl ? (
                        <img
                          src={first.artworkUrl}
                          alt={first.episodeTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-violet-500/20">
                          <Music2 size={14} className="text-primary/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-semibold truncate',
                        isCurrentEpisode ? 'text-primary' : 'text-slate-200',
                      )}>
                        {first.episodeTitle}
                      </p>
                      {first.speakerName && (
                        <p className="text-[11px] text-slate-500 truncate">{first.speakerName}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 flex-shrink-0">
                      {bms.length} mark{bms.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Bookmark entries */}
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {bms.map(bm => (
                        <motion.div
                          key={bm.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.18 }}
                          className="flex items-center gap-3 p-3.5 glass-card rounded-xl group"
                        >
                          {/* Position badge */}
                          <div className="flex-shrink-0 w-14 flex flex-col items-center justify-center bg-primary/10 rounded-lg py-1.5 px-1">
                            <Clock size={11} className="text-primary/70 mb-0.5" />
                            <span className="text-[11px] font-mono text-primary font-semibold">
                              {formatDuration(bm.position)}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            {bm.note ? (
                              <p className="text-sm text-slate-200 truncate font-medium">{bm.note}</p>
                            ) : (
                              <p className="text-sm text-slate-400 italic truncate">No note</p>
                            )}
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              {formatTimeAgo(bm.createdAt)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleResume(bm)}
                              aria-label="Resume from bookmark"
                              className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-all"
                            >
                              <Play size={14} className="ml-0.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(bm.id!)}
                              aria-label="Delete bookmark"
                              disabled={deletingId === bm.id}
                              className="p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
