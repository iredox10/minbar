import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { adminDatabases, uploadImage, createSeries, updateSeries, SERIES_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import type { Series, Speaker } from '../../types';
import { cn, slugify } from '../../lib/utils';

export function AdminSeriesForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    speakerId: '',
    description: '',
    artworkUrl: '',
    category: '',
    episodeCount: 0
  });

  const isEditing = !!id;

  useEffect(() => {
    loadSpeakers();
    if (id) loadSeries();
  }, [id]);

  async function loadSpeakers() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, 'speakers', [Query.limit(100)]);
      setSpeakers(response.documents as unknown as Speaker[]);
    } catch (error) {
      console.error('Failed to load speakers:', error);
    }
  }

  async function loadSeries() {
    setLoading(true);
    try {
      const doc = await adminDatabases.getDocument(DATABASE_ID, SERIES_COLLECTION, id!);
      const series = doc as unknown as Series;
      setFormData({
        title: series.title,
        slug: series.slug,
        speakerId: series.speakerId,
        description: series.description || '',
        artworkUrl: series.artworkUrl,
        category: series.category || '',
        episodeCount: series.episodeCount
      });
    } catch (error) {
      console.error('Failed to load series:', error);
      navigate('/admin/series');
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setFormData(prev => ({ ...prev, artworkUrl: url }));
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        await updateSeries(id!, formData);
      } else {
        await createSeries({
          title: formData.title,
          slug: formData.slug,
          speakerId: formData.speakerId,
          description: formData.description,
          artworkUrl: formData.artworkUrl,
          category: formData.category,
          episodeCount: formData.episodeCount
        });
      }
      navigate('/admin/series');
    } catch (error) {
      console.error('Failed to save series:', error);
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
        <button onClick={() => navigate('/admin/series')} className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{isEditing ? 'Edit Series' : 'Add Series'}</h1>
          <p className="text-slate-400 mt-1">{isEditing ? 'Update series information' : 'Create a new series'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Artwork</label>
            <div className="flex items-start gap-4">
              {formData.artworkUrl ? (
                <div className="relative group">
                  <img src={formData.artworkUrl} alt="Artwork" className="w-32 h-32 rounded-xl object-cover" />
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, artworkUrl: '' }))} className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="w-32 h-32 rounded-xl bg-slate-700/50 border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  {uploading ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : <Upload size={24} className="text-slate-400" />}
                </label>
              )}
              <p className="text-xs text-slate-500 mt-2">Square image recommended (1000x1000px)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Title *</label>
              <input type="text" value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="Series title" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Slug *</label>
              <input type="text" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="url-friendly-name" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Speaker *</label>
            <select value={formData.speakerId} onChange={(e) => setFormData(prev => ({ ...prev, speakerId: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all">
              <option value="">Select a speaker</option>
              {speakers.map(s => <option key={s.$id} value={s.$id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="e.g., Seerah, Fiqh" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Episode Count</label>
              <input type="number" value={formData.episodeCount} onChange={(e) => setFormData(prev => ({ ...prev, episodeCount: parseInt(e.target.value) || 0 }))} min="0" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none" placeholder="Series description..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/series')} className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-all">Cancel</button>
          <motion.button type="submit" disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.98 }} className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all", saving ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-primary text-slate-900 hover:bg-primary-light")}>
            {saving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />{isEditing ? 'Update Series' : 'Create Series'}</>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}