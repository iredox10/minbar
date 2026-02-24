import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, AlertCircle } from 'lucide-react';
import { adminDatabases, deleteSeries, SERIES_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import type { Series } from '../../types';

export function AdminSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, SERIES_COLLECTION, [
        Query.limit(500),
        Query.orderDesc('createdAt')
      ]);
      setSeries(response.documents as unknown as Series[]);
    } catch (error) {
      console.error('Failed to load series:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSeries(id);
      setSeries(prev => prev.filter(s => s.$id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete series:', error);
    }
  }

  const filteredSeries = series.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Series</h1>
          <p className="text-slate-400 mt-1">Manage podcast series and collections</p>
        </div>
        <Link
          to="/admin/series/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-xl font-medium hover:bg-primary-light transition-all"
        >
          <Plus size={18} />
          Add Series
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Search series..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl">
          <p className="text-slate-400">No series found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSeries.map((s) => (
            <motion.div
              key={s.$id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-all group"
            >
              <div className="aspect-square relative">
                <img
                  src={s.artworkUrl}
                  alt={s.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-semibold text-slate-100 line-clamp-2">{s.title}</p>
                  <p className="text-sm text-slate-400 mt-1">{s.episodeCount} episodes</p>
                </div>
              </div>
              <div className="p-4 flex items-center gap-2">
                <button
                  onClick={() => navigate(`/admin/series/${s.$id}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(s.$id)}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-semibold text-slate-100">Delete Series?</h3>
              </div>
              <p className="text-slate-400 mb-6">
                This will delete the series but episodes will remain. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-medium">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-medium">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}