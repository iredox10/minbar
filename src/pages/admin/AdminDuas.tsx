import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, AlertCircle } from 'lucide-react';
import { adminDatabases, deleteDua, DUAS_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import type { Dua, DuaCategory } from '../../types';

const categoryLabels: Record<DuaCategory, string> = {
  prophetic: 'Prophetic',
  quranic: 'Quranic',
  morning: 'Morning',
  evening: 'Evening',
  sleep: 'Sleep',
  travel: 'Travel',
  eating: 'Eating',
  general: 'General'
};

export function AdminDuas() {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DuaCategory | ''>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDuas();
  }, []);

  async function loadDuas() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, DUAS_COLLECTION, [
        Query.orderAsc('sortOrder'),
        Query.limit(500)
      ]);
      setDuas(response.documents as unknown as Dua[]);
    } catch (error) {
      console.error('Failed to load duas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDua(id);
      setDuas(prev => prev.filter(d => d.$id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete dua:', error);
    }
  }

  const filteredDuas = duas.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Duas</h1>
          <p className="text-slate-400 mt-1">Manage supplications and prayers</p>
        </div>
        <Link to="/admin/duas/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-xl font-medium hover:bg-primary-light transition-all">
          <Plus size={18} />
          Add Dua
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input type="text" placeholder="Search duas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as DuaCategory | '')} className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all">
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-4 animate-pulse">
              <div className="h-4 w-3/4 bg-slate-700 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : filteredDuas.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl">
          <p className="text-slate-400">No duas found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDuas.map((dua) => (
            <motion.div key={dua.$id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">{dua.title}</p>
                    <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-400 rounded-full">{categoryLabels[dua.category]}</span>
                  </div>
                  <p className="text-right text-lg text-slate-300 font-arabic mb-1" dir="rtl">{dua.arabic}</p>
                  <p className="text-sm text-slate-500 truncate">{dua.translation}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => navigate(`/admin/duas/${dua.$id}`)} className="p-2 text-slate-400 hover:text-slate-200 rounded-lg transition-all">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => setDeleteConfirm(dua.$id)} className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-all">
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
                <h3 className="text-lg font-semibold text-slate-100">Delete Dua?</h3>
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