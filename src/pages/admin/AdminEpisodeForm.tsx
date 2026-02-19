import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { adminDatabases, uploadAudio, createEpisode, updateEpisode, EPISODES_COLLECTION, SERIES_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import type { Episode, Series } from '../../types';
import { cn, slugify } from '../../lib/utils';

export function AdminEpisodeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    seriesId: '',
    audioUrl: '',
    duration: 0,
    publishedAt: '',
    description: '',
    episodeNumber: 1
  });

  const isEditing = !!id;

  useEffect(() => {
    loadSeries();
    if (id) loadEpisode();
  }, [id]);

  async function loadSeries() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, SERIES_COLLECTION, [Query.limit(100)]);
      setSeriesList(response.documents as unknown as Series[]);
    } catch (error) {
      console.error('Failed to load series:', error);
    }
  }

  async function loadEpisode() {
    setLoading(true);
    try {
      const doc = await adminDatabases.getDocument(DATABASE_ID, EPISODES_COLLECTION, id!);
      const episode = doc as unknown as Episode;
      setFormData({
        title: episode.title,
        slug: episode.slug,
        seriesId: episode.seriesId,
        audioUrl: episode.audioUrl,
        duration: episode.duration,
        publishedAt: episode.publishedAt ? episode.publishedAt.split('T')[0] : '',
        description: episode.description || '',
        episodeNumber: episode.episodeNumber || 1
      });
    } catch (error) {
      console.error('Failed to load episode:', error);
      navigate('/admin/episodes');
    } finally {
      setLoading(false);
    }
  }

  function handleTitleChange(title: string) {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || slugify(title)
    }));
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadAudio(file);
      setFormData(prev => ({ ...prev, audioUrl: url }));
    } catch (error) {
      console.error('Failed to upload audio:', error);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt).toISOString() : new Date().toISOString()
      };

      if (isEditing) {
        await updateEpisode(id!, data);
      } else {
        await createEpisode(data);
      }
      navigate('/admin/episodes');
    } catch (error) {
      console.error('Failed to save episode:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/episodes')} className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{isEditing ? 'Edit Episode' : 'Add Episode'}</h1>
          <p className="text-slate-400 mt-1">{isEditing ? 'Update episode information' : 'Create a new episode'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Audio File</label>
            {formData.audioUrl ? (
              <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl">
                <audio controls src={formData.audioUrl} className="flex-1 h-10" />
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, audioUrl: '' }))} className="p-2 text-slate-400 hover:text-rose-400 transition-colors">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-3 p-8 bg-slate-700/30 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" disabled={uploading} />
                {uploading ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : <Upload size={24} className="text-slate-400" />}
                <span className="text-slate-400">{uploading ? 'Uploading...' : 'Click to upload audio file'}</span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Title *</label>
              <input type="text" value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="Episode title" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Slug *</label>
              <input type="text" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="url-friendly-name" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Series *</label>
              <select value={formData.seriesId} onChange={(e) => setFormData(prev => ({ ...prev, seriesId: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all">
                <option value="">Select a series</option>
                {seriesList.map(s => <option key={s.$id} value={s.$id}>{s.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Episode Number</label>
              <input type="number" value={formData.episodeNumber} onChange={(e) => setFormData(prev => ({ ...prev, episodeNumber: parseInt(e.target.value) || 1 }))} min="1" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Duration (seconds)</label>
              <input type="number" value={formData.duration} onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))} min="0" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Published Date</label>
              <input type="date" value={formData.publishedAt} onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={4} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none" placeholder="Episode description..." />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Audio URL (or upload above)</label>
            <input type="url" value={formData.audioUrl} onChange={(e) => setFormData(prev => ({ ...prev, audioUrl: e.target.value }))} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="https://..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/episodes')} className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-all">Cancel</button>
          <motion.button type="submit" disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.98 }} className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all", saving ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-primary text-slate-900 hover:bg-primary-light")}>
            {saving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />{isEditing ? 'Update Episode' : 'Create Episode'}</>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}