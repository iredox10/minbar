import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { adminDatabases, createDua, updateDua, DUAS_COLLECTION, DATABASE_ID } from '../../lib/admin';
import type { Dua, DuaCategory } from '../../types';
import { cn } from '../../lib/utils';

const categoryOptions: { value: DuaCategory; label: string }[] = [
  { value: 'prophetic', label: 'Prophetic' },
  { value: 'quranic', label: 'Quranic' },
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'travel', label: 'Travel' },
  { value: 'eating', label: 'Eating' },
  { value: 'general', label: 'General' }
];

export function AdminDuaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    arabic: '',
    transliteration: '',
    translation: '',
    reference: '',
    category: 'general' as DuaCategory,
    audioUrl: '',
    sortOrder: 0
  });

  const isEditing = !!id;

  useEffect(() => {
    if (id) loadDua();
  }, [id]);

  async function loadDua() {
    setLoading(true);
    try {
      const doc = await adminDatabases.getDocument(DATABASE_ID, DUAS_COLLECTION, id!);
      const dua = doc as unknown as Dua;
      setFormData({
        title: dua.title,
        arabic: dua.arabic,
        transliteration: dua.transliteration || '',
        translation: dua.translation,
        reference: dua.reference,
        category: dua.category,
        audioUrl: dua.audioUrl || '',
        sortOrder: dua.sortOrder
      });
    } catch (error) {
      console.error('Failed to load dua:', error);
      navigate('/admin/duas');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        await updateDua(id!, formData);
      } else {
        await createDua(formData);
      }
      navigate('/admin/duas');
    } catch (error) {
      console.error('Failed to save dua:', error);
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
        <button onClick={() => navigate('/admin/duas')} className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{isEditing ? 'Edit Dua' : 'Add Dua'}</h1>
          <p className="text-slate-400 mt-1">{isEditing ? 'Update supplication' : 'Add a new supplication'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Title *</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="Dua title" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as DuaCategory }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all">
                {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Arabic Text *</label>
            <textarea value={formData.arabic} onChange={(e) => setFormData(prev => ({ ...prev, arabic: e.target.value }))} required dir="rtl" rows={3} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none text-right text-lg" placeholder="دعاء بالعربية" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Transliteration</label>
            <textarea value={formData.transliteration} onChange={(e) => setFormData(prev => ({ ...prev, transliteration: e.target.value }))} rows={2} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none" placeholder="Allahumma..." />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Translation *</label>
            <textarea value={formData.translation} onChange={(e) => setFormData(prev => ({ ...prev, translation: e.target.value }))} required rows={2} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none" placeholder="English translation..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Reference</label>
              <input type="text" value={formData.reference} onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="Sahih Bukhari, etc." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Sort Order</label>
              <input type="number" value={formData.sortOrder} onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))} min="0" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Audio URL (optional)</label>
            <input type="url" value={formData.audioUrl} onChange={(e) => setFormData(prev => ({ ...prev, audioUrl: e.target.value }))} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="https://..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/duas')} className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-all">Cancel</button>
          <motion.button type="submit" disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.98 }} className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all", saving ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-primary text-slate-900 hover:bg-primary-light")}>
            {saving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />{isEditing ? 'Update Dua' : 'Create Dua'}</>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}