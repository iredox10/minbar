import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Upload, X, Loader2, Music2, AlertCircle, Replace } from 'lucide-react';
import { adminDatabases, uploadAudio, createEpisode, updateEpisode, EPISODES_COLLECTION, SERIES_COLLECTION, SPEAKERS_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import type { Episode, Series, Speaker } from '../../types';
import { cn, slugify } from '../../lib/utils';
import { TagsInput } from '../../components/admin/TagsInput';

function formatDurationAuto(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function AdminEpisodeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [speakerList, setSpeakerList] = useState<Speaker[]>([]);
  const [contentType, setContentType] = useState<'series' | 'standalone'>('series');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    seriesId: '',
    speakerId: '',
    audioUrl: '',
    duration: 0,
    publishedAt: '',
    description: '',
    episodeNumber: 1,
    tags: [] as string[],
    isStandalone: false
  });

  const isEditing = !!id;

  useEffect(() => {
    loadSeries();
    loadSpeakers();
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

  async function loadSpeakers() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION, [Query.limit(100)]);
      setSpeakerList(response.documents as unknown as Speaker[]);
    } catch (error) {
      console.error('Failed to load speakers:', error);
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
        seriesId: episode.seriesId || '',
        speakerId: episode.speakerId || '',
        audioUrl: episode.audioUrl,
        duration: episode.duration,
        publishedAt: episode.publishedAt ? episode.publishedAt.split('T')[0] : '',
        description: episode.description || '',
        episodeNumber: episode.episodeNumber || 1,
        tags: episode.tags || [],
        isStandalone: episode.isStandalone || false
      });
      setContentType(episode.isStandalone ? 'standalone' : 'series');
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

  function handleAudioUrlChange(url: string) {
    setFormData(prev => ({ ...prev, audioUrl: url }));
    
    if (url) {
      const audio = new Audio();
      audio.src = url;
      
      audio.onloadedmetadata = () => {
        const durationSeconds = Math.round(audio.duration);
        setFormData(prev => ({ ...prev, duration: durationSeconds }));
      };
    }
  }

  function handleContentTypeChange(type: 'series' | 'standalone') {
    setContentType(type);
    setFormData(prev => ({
      ...prev,
      isStandalone: type === 'standalone',
      seriesId: type === 'standalone' ? '' : prev.seriesId,
      speakerId: type === 'series' ? '' : prev.speakerId
    }));
  }

  async function processAudioFile(file: File) {
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select a valid audio file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setUploadError('File size must be less than 500MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);

    try {
      const url = await uploadAudio(file);
      setUploadProgress(100);
      
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      
      audio.onloadedmetadata = () => {
        const durationSeconds = Math.round(audio.duration);
        setFormData(prev => ({ 
          ...prev, 
          audioUrl: url,
          duration: durationSeconds
        }));
        URL.revokeObjectURL(audio.src);
        setUploading(false);
        setUploadProgress(0);
        setSelectedFileName(null);
        setSelectedFileSize(null);
      };
      
      audio.onerror = () => {
        setFormData(prev => ({ ...prev, audioUrl: url }));
        URL.revokeObjectURL(audio.src);
        setUploading(false);
        setUploadProgress(0);
        setSelectedFileName(null);
        setSelectedFileSize(null);
      };
    } catch (error) {
      console.error('Failed to upload audio:', error);
      setUploadError('Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
      setSelectedFileName(null);
      setSelectedFileSize(null);
    }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAudioFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processAudioFile(file);
    }
  }, []);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <h1 className="text-2xl font-bold text-slate-100">{isEditing ? 'Edit Audio' : 'Add Audio'}</h1>
          <p className="text-slate-400 mt-1">{isEditing ? 'Update audio information' : 'Upload a new audio'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Content Type</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleContentTypeChange('series')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border transition-all",
                  contentType === 'series'
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-slate-700/30 border-slate-600 text-slate-400 hover:border-slate-500"
                )}
              >
                Part of a Series
              </button>
              <button
                type="button"
                onClick={() => handleContentTypeChange('standalone')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border transition-all",
                  contentType === 'standalone'
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-slate-700/30 border-slate-600 text-slate-400 hover:border-slate-500"
                )}
              >
                Standalone (Speaker)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Audio File</label>
            {formData.audioUrl && !uploading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Music2 size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <audio controls src={formData.audioUrl} className="w-full h-10" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                  >
                    <Replace size={14} />
                    Replace Audio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, audioUrl: '', duration: 0 }));
                      setSelectedFileName(null);
                      setSelectedFileSize(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors text-sm"
                  >
                    <X size={14} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative p-8 border-2 border-dashed rounded-xl transition-all",
                  isDragOver
                    ? "border-primary bg-primary/10"
                    : "border-slate-600 bg-slate-700/30 hover:border-primary/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-slate-300 font-medium">Uploading audio...</p>
                      {selectedFileName && selectedFileSize !== null && (
                        <p className="text-xs text-slate-500 mt-1">{selectedFileName} ({formatFileSize(selectedFileSize)})</p>
                      )}
                    </div>
                    <div className="w-full max-w-xs bg-slate-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{uploadProgress}%</p>
                  </div>
                ) : uploadError ? (
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <p className="text-rose-400 text-sm">{uploadError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-primary text-slate-900 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-3 cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-slate-600/50 flex items-center justify-center">
                      <Upload size={24} className="text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-slate-300 font-medium">Drop audio file here or click to browse</p>
                      <p className="text-xs text-slate-500 mt-1">MP3, WAV, M4A, OGG — Max 500MB</p>
                    </div>
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Title *</label>
              <input type="text" value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="Audio title" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Slug *</label>
              <input type="text" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="url-friendly-name" />
            </div>
          </div>

          {contentType === 'series' ? (
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
          ) : (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Speaker *</label>
              <select value={formData.speakerId} onChange={(e) => setFormData(prev => ({ ...prev, speakerId: e.target.value }))} required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all">
                <option value="">Select a speaker</option>
                {speakerList.map(s => <option key={s.$id} value={s.$id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Duration</label>
              <div className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-xl text-slate-100">
                {formData.duration > 0 ? formatDurationAuto(formData.duration) : 'Auto-calculated on upload'}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Published Date</label>
              <input type="date" value={formData.publishedAt} onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={4} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none" placeholder="Audio description..." />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Tags</label>
            <TagsInput 
              tags={formData.tags} 
              onChange={(tags) => setFormData(prev => ({ ...prev, tags }))} 
              placeholder="Add tags (e.g. Ramadan, Tafseer)..." 
            />
            <p className="text-xs text-slate-500 mt-2">Press enter or comma to add a tag. Used for categorization and search.</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Audio URL (or upload above)</label>
            <input type="url" value={formData.audioUrl} onChange={(e) => handleAudioUrlChange(e.target.value)} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all" placeholder="https://..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/episodes')} className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-all">Cancel</button>
          <motion.button type="submit" disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.98 }} className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all", saving ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-primary text-slate-900 hover:bg-primary-light")}>
            {saving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />{isEditing ? 'Update Audio' : 'Create Audio'}</>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}