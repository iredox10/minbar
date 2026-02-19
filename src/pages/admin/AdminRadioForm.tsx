import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, X, Loader2, Radio } from 'lucide-react';
import { adminDatabases, uploadImage, createRadioStation, updateRadioStation, RADIO_COLLECTION, DATABASE_ID } from '../../lib/admin';
import type { RadioStation } from '../../types';
import { cn } from '../../lib/utils';

export function AdminRadioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    streamUrl: '',
    logoUrl: '',
    description: '',
    isLive: true
  });

  const isEditing = !!id;

  useEffect(() => {
    if (id) loadStation();
  }, [id]);

  async function loadStation() {
    setLoading(true);
    try {
      const doc = await adminDatabases.getDocument(DATABASE_ID, RADIO_COLLECTION, id!);
      const station = doc as unknown as RadioStation;
      setFormData({
        name: station.name,
        streamUrl: station.streamUrl,
        logoUrl: station.logoUrl || '',
        description: station.description || '',
        isLive: station.isLive
      });
    } catch (error) {
      console.error('Failed to load station:', error);
      navigate('/admin/radio');
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setFormData(prev => ({ ...prev, logoUrl: url }));
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
        await updateRadioStation(id!, formData);
      } else {
        await createRadioStation(formData);
      }
      navigate('/admin/radio');
    } catch (error) {
      console.error('Failed to save station:', error);
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
        <button onClick={() => navigate('/admin/radio')} className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{isEditing ? 'Edit Station' : 'Add Station'}</h1>
          <p className="text-slate-400 mt-1">{isEditing ? 'Update radio station' : 'Add a new radio station'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Logo</label>
            <div className="flex items-start gap-4">
              {formData.logoUrl ? (
                <div className="relative group">
                  <img src={formData.logoUrl} alt="Logo" className="w-20 h-20 rounded-xl object-cover" />
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))} className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl bg-slate-700/50 border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  {uploading ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin" /> : <Radio size={20} className="text-slate-400" />}
                </label>
              )}
              <p className="text-xs text-slate-500 mt-2">Square image recommended</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Station Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="Station name" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Stream URL *</label>
            <input type="url" value={formData.streamUrl} onChange={(e) => setFormData(prev => ({ ...prev, streamUrl: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="https://stream.example.com/radio" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none" placeholder="Station description..." />
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.isLive} onChange={(e) => setFormData(prev => ({ ...prev, isLive: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </label>
            <span className="text-slate-300">Station is live</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/radio')} className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-all">Cancel</button>
          <motion.button type="submit" disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.98 }} className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all", saving ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-primary text-slate-900 hover:bg-primary-light")}>
            {saving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />{isEditing ? 'Update Station' : 'Create Station'}</>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}