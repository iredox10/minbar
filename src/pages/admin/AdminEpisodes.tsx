import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, AlertCircle, Music, BookOpen } from 'lucide-react';
import { adminDatabases, deleteEpisode, EPISODES_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import type { Episode } from '../../types';
import { formatDuration, formatDate, cn } from '../../lib/utils';

export function AdminEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'series' | 'standalone'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadEpisodes();
  }, []);

  async function loadEpisodes() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, EPISODES_COLLECTION, [
        Query.orderDesc('publishedAt'),
        Query.limit(100)
      ]);
      setEpisodes(response.documents as unknown as Episode[]);
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEpisode(id);
      setEpisodes(prev => prev.filter(e => e.$id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete episode:', error);
    }
  }

  const filteredEpisodes = episodes.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'series' && !e.isStandalone) ||
      (filter === 'standalone' && e.isStandalone);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Audio Content</h1>
          <p className="text-slate-400 mt-1">Manage episodes and standalone audio</p>
        </div>
        <Link to="/admin/episodes/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-xl font-medium hover:bg-primary-light transition-all">
          <Plus size={18} />
          Add Audio
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input type="text" placeholder="Search audio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" />
        </div>
        <div className="flex gap-2">
          {(['all', 'series', 'standalone'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl font-medium transition-all",
                filter === f
                  ? "bg-primary text-slate-900"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              )}
            >
              {f === 'all' ? 'All' : f === 'series' ? 'Series' : 'Standalone'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-700 rounded" />
                  <div className="h-3 w-1/2 bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEpisodes.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl">
          <p className="text-slate-400">No audio found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEpisodes.map((episode) => (
            <motion.div key={episode.$id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  episode.isStandalone 
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-slate-700/50 text-slate-400"
                )}>
                  {episode.isStandalone ? (
                    <Music size={20} />
                  ) : (
                    <span className="text-sm font-mono">#{episode.episodeNumber || '?'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">{episode.title}</p>
                    {episode.isStandalone && (
                      <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">Standalone</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      {episode.isStandalone ? <Music size={12} /> : <BookOpen size={12} />}
                      {formatDuration(episode.duration)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span>{episode.publishedAt ? formatDate(episode.publishedAt) : 'No date'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/admin/episodes/${episode.$id}`)} className="p-2 text-slate-400 hover:text-slate-200 rounded-lg transition-all">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => setDeleteConfirm(episode.$id)} className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700">
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-semibold text-slate-100">Delete Audio?</h3>
              </div>
              <p className="text-slate-400 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-medium">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-medium">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}