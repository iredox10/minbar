import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Plus, MoreVertical, Trash2, Edit, Play, X, Check } from 'lucide-react';
import { getPlaylists, createPlaylist, deletePlaylist, getPlaylistItems } from '../lib/db';
import type { Playlist } from '../types';
import { formatRelativeDate, cn } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Playlists() {
  const [playlists, setPlaylists] = useState<(Playlist & { itemCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    async function loadPlaylists() {
      try {
        const data = await getPlaylists();
        const playlistsWithCount = await Promise.all(
          data.map(async (p) => {
            const items = await getPlaylistItems(p.id!);
            return { ...p, itemCount: items.length };
          })
        );
        setPlaylists(playlistsWithCount);
      } catch (error) {
        console.error('Failed to load playlists:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPlaylists();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const id = await createPlaylist(newName.trim(), newDescription.trim() || undefined);
    setPlaylists(prev => [{
      id,
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      itemCount: 0
    }, ...prev]);
    
    setNewName('');
    setNewDescription('');
    setShowCreate(false);
  };

  const handleDelete = async (id: number) => {
    await deletePlaylist(id);
    setPlaylists(prev => prev.filter(p => p.id !== id));
    setMenuOpen(null);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ListMusic size={20} className="text-primary" />
            Playlists
          </h1>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(true)}
            className="p-2 bg-primary/20 text-primary rounded-xl"
          >
            <Plus size={20} />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Create Playlist</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1 text-slate-500 hover:text-slate-300"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My Playlist"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Description (optional)</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2",
                      newName.trim()
                        ? "bg-primary text-slate-900"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    <Check size={18} />
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 pb-24">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl">
                <div className="w-16 h-16 rounded-xl skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 skeleton rounded" />
                  <div className="h-3 w-24 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <ListMusic className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">No playlists yet</p>
            <p className="text-sm text-slate-500 mt-2 mb-4">
              Create your first playlist to organize episodes
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-primary text-slate-900 font-medium rounded-xl flex items-center gap-2 mx-auto"
            >
              <Plus size={18} />
              Create Playlist
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {playlists.map((playlist) => (
              <motion.div
                key={playlist.id}
                variants={item}
                whileHover={{ x: 4 }}
              >
                <div className="glass-card rounded-2xl p-4 group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <ListMusic className="w-6 h-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">
                        {playlist.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{playlist.itemCount || 0} episodes</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>{formatRelativeDate(new Date(playlist.createdAt))}</span>
                      </div>
                      {playlist.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {playlist.description}
                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setMenuOpen(menuOpen === playlist.id ? null : playlist.id!)}
                        className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </motion.button>

                      <AnimatePresence>
                        {menuOpen === playlist.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 py-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 min-w-[120px]"
                          >
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Play size={14} />
                              Play All
                            </button>
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(playlist.id!)}
                              className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}