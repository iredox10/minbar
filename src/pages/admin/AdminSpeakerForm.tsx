import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { adminDatabases, uploadImage, createSpeaker, updateSpeaker, SPEAKERS_COLLECTION, DATABASE_ID } from '../../lib/admin';
import type { Speaker } from '../../types';
import { cn, slugify } from '../../lib/utils';

export function AdminSpeakerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    bio: '',
    imageUrl: '',
    featured: false
  });

  const isEditing = !!id;

  useEffect(() => {
    if (id) {
      loadSpeaker();
    }
  }, [id]);

  async function loadSpeaker() {
    setLoading(true);
    try {
      const doc = await adminDatabases.getDocument(DATABASE_ID, SPEAKERS_COLLECTION, id!);
      const speaker = doc as unknown as Speaker;
      setFormData({
        name: speaker.name,
        slug: speaker.slug,
        bio: speaker.bio || '',
        imageUrl: speaker.imageUrl,
        featured: speaker.featured
      });
    } catch (error) {
      console.error('Failed to load speaker:', error);
      navigate('/admin/speakers');
    } finally {
      setLoading(false);
    }
  }

  function handleNameChange(name: string) {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || slugify(name)
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setFormData(prev => ({ ...prev, imageUrl: url }));
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
        await updateSpeaker(id!, formData);
      } else {
        await createSpeaker({
          name: formData.name,
          slug: formData.slug,
          bio: formData.bio,
          imageUrl: formData.imageUrl,
          featured: formData.featured
        });
      }
      navigate('/admin/speakers');
    } catch (error) {
      console.error('Failed to save speaker:', error);
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
        <button
          onClick={() => navigate('/admin/speakers')}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {isEditing ? 'Edit Speaker' : 'Add Speaker'}
          </h1>
          <p className="text-slate-400 mt-1">
            {isEditing ? 'Update speaker information' : 'Create a new speaker profile'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Profile Image</label>
            <div className="flex items-start gap-4">
              {formData.imageUrl ? (
                <div className="relative group">
                  <img
                    src={formData.imageUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="w-24 h-24 rounded-full bg-slate-700/50 border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  ) : (
                    <Upload size={24} className="text-slate-400" />
                  )}
                </label>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Square image recommended (512x512px).<br />
                Click to upload or drag and drop.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
                placeholder="Speaker name"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
                placeholder="url-friendly-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none"
              placeholder="Brief biography or description..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-primary transition-colors" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </label>
            <span className="text-slate-300">Featured speaker</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/speakers')}
            className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-all"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={saving}
            whileHover={{ scale: saving ? 1 : 1.02 }}
            whileTap={{ scale: saving ? 1 : 0.98 }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
              saving
                ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                : "bg-primary text-slate-900 hover:bg-primary-light"
            )}
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                {isEditing ? 'Update Speaker' : 'Create Speaker'}
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}