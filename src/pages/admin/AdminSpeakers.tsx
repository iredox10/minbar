import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Star, StarOff, AlertCircle } from 'lucide-react';
import { adminDatabases, deleteSpeaker, SPEAKERS_COLLECTION, DATABASE_ID } from '../../lib/admin';
import type { Speaker } from '../../types';
import { cn } from '../../lib/utils';

export function AdminSpeakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSpeakers();
  }, []);

  async function loadSpeakers() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION);
      setSpeakers(response.documents as unknown as Speaker[]);
    } catch (error) {
      console.error('Failed to load speakers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSpeaker(id);
      setSpeakers(prev => prev.filter(s => s.$id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete speaker:', error);
    }
  }

  async function toggleFeatured(speaker: Speaker) {
    try {
      await adminDatabases.updateDocument(DATABASE_ID, SPEAKERS_COLLECTION, speaker.$id, {
        featured: !speaker.featured
      });
      setSpeakers(prev => prev.map(s => 
        s.$id === speaker.$id ? { ...s, featured: !s.featured } : s
      ));
    } catch (error) {
      console.error('Failed to update speaker:', error);
    }
  }

  const filteredSpeakers = speakers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Speakers</h1>
          <p className="text-slate-400 mt-1">Manage podcast speakers and scholars</p>
        </div>
        <Link
          to="/admin/speakers/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-xl font-medium hover:bg-primary-light transition-all"
        >
          <Plus size={18} />
          Add Speaker
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Search speakers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-700 rounded" />
                  <div className="h-3 w-24 bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredSpeakers.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl">
          <p className="text-slate-400">No speakers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpeakers.map((speaker) => (
            <motion.div
              key={speaker.$id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all group"
            >
              <div className="flex items-start gap-4">
                <img
                  src={speaker.imageUrl}
                  alt={speaker.name}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-100 truncate">{speaker.name}</p>
                    {speaker.featured && (
                      <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">Featured</span>
                    )}
                  </div>
                  {speaker.bio && (
                    <p className="text-sm text-slate-400 truncate mt-0.5">{speaker.bio}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">/{speaker.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => toggleFeatured(speaker)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm",
                    speaker.featured
                      ? "bg-primary/20 text-primary"
                      : "bg-slate-700/50 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {speaker.featured ? <StarOff size={16} /> : <Star size={16} />}
                  {speaker.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => navigate(`/admin/speakers/${speaker.$id}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(speaker.$id)}
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
                <h3 className="text-lg font-semibold text-slate-100">Delete Speaker?</h3>
              </div>
              <p className="text-slate-400 mb-6">
                This action cannot be undone. All series and episodes by this speaker will remain but won't be associated.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-medium"
                >
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