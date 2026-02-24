import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, CheckSquare, Square, Upload, ExternalLink, AlertCircle, Music, Clock, HardDrive, Plus, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { fetchArchiveMetadata, parseArchiveItem, type ParsedArchiveItem } from '../../lib/archive';
import { createSpeaker, createSeries, createEpisode, uploadImage, adminDatabases, SPEAKERS_COLLECTION, SERIES_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import { cn, slugify } from '../../lib/utils';
import { toast } from 'sonner';

interface Speaker {
  $id: string;
  name: string;
  slug: string;
}

interface EditableSeriesInfo {
  title: string;
  speakerId: string;
  speakerName: string;
  description: string;
  category: string;
  artworkUrl: string;
}

const CATEGORIES = [
  'Lectures',
  'Quran',
  'Seerah',
  'Fiqh',
  'Aqeedah',
  'Tafsir',
  'Hadith',
  'Dua',
  'History',
  'Family',
  'Youth',
  'Other'
];

export function AdminArchiveImport() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedItem, setParsedItem] = useState<ParsedArchiveItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [manualJson, setManualJson] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false);
  const [newSpeakerMode, setNewSpeakerMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [seriesInfo, setSeriesInfo] = useState<EditableSeriesInfo>({
    title: '',
    speakerId: '',
    speakerName: '',
    description: '',
    category: 'Lectures',
    artworkUrl: ''
  });
  
  useEffect(() => {
    loadSpeakers();
  }, []);
  
  useEffect(() => {
    if (parsedItem) {
      setSeriesInfo({
        title: parsedItem.title,
        speakerId: '',
        speakerName: parsedItem.creator,
        description: parsedItem.description?.substring(0, 5000) || '',
        category: 'Lectures',
        artworkUrl: `https://archive.org/services/img/${parsedItem.identifier}`
      });
      setNewSpeakerMode(true);
    }
  }, [parsedItem]);
  
  async function loadSpeakers() {
    try {
      const response = await adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION, [
        Query.orderAsc('name'),
        Query.limit(500)
      ]);
      setSpeakers(response.documents as unknown as Speaker[]);
    } catch (error) {
      console.error('Failed to load speakers:', error);
    }
  }

  async function handleFetch() {
    if (!identifier.trim()) return
    
    setLoading(true);
    setError(null);
    setParsedItem(null);
    setSelectedFiles(new Set());
    
    try {
      const metadata = await fetchArchiveMetadata(identifier.trim());
      console.log('Raw metadata response:', metadata);
      
      if (!metadata) {
        setError('Could not fetch metadata. This may be due to network/CORS restrictions. Check browser console for details.');
        return;
      }
      
      console.log('Metadata keys:', Object.keys(metadata));
      console.log('Files count:', metadata.files?.length);
      console.log('First few files:', metadata.files?.slice?.(0, 5));
      
      if (!metadata.files || !Array.isArray(metadata.files)) {
        setError(`Invalid response structure. Got keys: ${Object.keys(metadata).join(', ')}. Check console for details.`);
        return;
      }
      
      const parsed = parseArchiveItem(metadata);
      if (parsed.audioFiles.length === 0) {
        setError('No audio files found in this archive item.');
        return;
      }
      
      setParsedItem(parsed);
      setSeriesInfo({
        title: parsed.title,
        speakerId: '',
        speakerName: parsed.creator,
        description: parsed.description?.substring(0, 5000) || '',
        category: 'Lectures',
        artworkUrl: `https://archive.org/services/img/${parsed.identifier}`
      });
      setNewSpeakerMode(true);
      setSelectedFiles(new Set(parsed.audioFiles.map((_, i) => i)));
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(`Failed to fetch: ${err.message || 'Unknown error'}. Check browser console.`);
    } finally {
      setLoading(false);
    }
  }
  
  function toggleFile(index: number) {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFiles(newSelected);
  }
  
  function toggleAll() {
    if (parsedItem) {
      if (selectedFiles.size === parsedItem.audioFiles.length) {
        setSelectedFiles(new Set());
      } else {
        setSelectedFiles(new Set(parsedItem.audioFiles.map((_, i) => i)));
      }
    }
  }
  
  function handleManualJsonParse() {
    if (!manualJson.trim()) return
    
    try {
      const metadata = JSON.parse(manualJson);
      if (!metadata.files || !Array.isArray(metadata.files)) {
        setError('Invalid JSON: missing files array');
        return;
      }
      
      const parsed = parseArchiveItem(metadata);
      if (parsed.audioFiles.length === 0) {
        setError('No audio files found in the provided JSON');
        return;
      }
      
      setParsedItem(parsed);
      setSeriesInfo({
        title: parsed.title,
        speakerId: '',
        speakerName: parsed.creator,
        description: parsed.description?.substring(0, 5000) || '',
        category: 'Lectures',
        artworkUrl: `https://archive.org/services/img/${parsed.identifier}`
      });
      setNewSpeakerMode(true);
      setSelectedFiles(new Set(parsed.audioFiles.map((_, i) => i)));
      setError(null);
      setShowManualInput(false);
      setManualJson('');
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  }
  
  async function handleImport() {
    if (!parsedItem || selectedFiles.size === 0) return
    
    setImporting(true);
    setImportProgress({ current: 0, total: selectedFiles.size });
    
    try {
      let speakerId: string | undefined;
      
      if (seriesInfo.speakerId) {
        speakerId = seriesInfo.speakerId;
      } else {
        const speakerSlug = slugify(seriesInfo.speakerName);
        
        const existingSpeakers = await adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION, [
          Query.equal('slug', speakerSlug),
          Query.limit(1)
        ]);
        
        if (existingSpeakers.documents.length > 0) {
          speakerId = existingSpeakers.documents[0].$id;
        } else {
          speakerId = await createSpeaker({
            name: seriesInfo.speakerName,
            slug: speakerSlug,
            bio: '',
            imageUrl: seriesInfo.artworkUrl,
            featured: false
          });
          await loadSpeakers();
        }
      }

      let seriesId: string | undefined;
      const seriesSlug = slugify(seriesInfo.title);
      
      const existingSeries = await adminDatabases.listDocuments(DATABASE_ID, SERIES_COLLECTION, [
        Query.equal('slug', seriesSlug),
        Query.limit(1)
      ]);
      
      if (existingSeries.documents.length > 0) {
        seriesId = existingSeries.documents[0].$id;
      } else {
        seriesId = await createSeries({
          title: seriesInfo.title,
          slug: seriesSlug,
          speakerId: speakerId,
          description: seriesInfo.description?.substring(0, 5000) || '',
          artworkUrl: seriesInfo.artworkUrl,
          category: seriesInfo.category,
          episodeCount: selectedFiles.size
        });
      }

      const filesToImport = parsedItem.audioFiles.filter((_, i) => selectedFiles.has(i));
      
      for (let idx = 0; idx < filesToImport.length; idx++) {
        const file = filesToImport[idx];
        setImportProgress({ current: idx + 1, total: filesToImport.length });
        
        await createEpisode({
          title: file.title,
          slug: slugify(`${parsedItem.identifier}-${file.name}`),
          seriesId: seriesId,
          audioUrl: file.url,
          duration: file.duration,
          description: '',
          episodeNumber: idx + 1,
          publishedAt: new Date().toISOString(),
          isStandalone: false
        });
      }

      toast.success(`Imported ${filesToImport.length} audio files successfully!`);
      setParsedItem(null);
      setIdentifier('');
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import. Check console for details.');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Import from Archive.org</h1>
        <p className="text-slate-400 mt-1">Import audio series directly from Internet Archive</p>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">Archive.org Identifier</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                  placeholder="e.g., islamic_lectures, namaaz-prophet-muhammad"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFetch}
                disabled={loading || !identifier.trim()}
                className={cn(
                  "px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all",
                  loading || !identifier.trim()
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-primary text-slate-900 hover:bg-primary-light"
                )}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {loading ? 'Fetching...' : 'Fetch'}
              </motion.button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Enter the <strong>identifier</strong> from archive.org/details/<strong>IDENTIFIER</strong> (use underscores, not spaces)
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs text-slate-500">Examples:</span>
              {['islamic_lectures', 'Seerah-Mufti-Menk', 'Quran-Mishary-Rashid-Alafasy'].map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIdentifier(id)}
                  className="text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded hover:text-primary transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-primary hover:underline mt-2"
            >
              {showManualInput ? 'Hide' : 'Show'} manual JSON input (fallback)
            </button>
          </div>
        </div>
        
        {showManualInput && (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-slate-400">
              Paste Archive.org JSON metadata (from https://archive.org/metadata/IDENTIFIER)
            </label>
            <textarea
              value={manualJson}
              onChange={(e) => setManualJson(e.target.value)}
              placeholder='{"metadata": {...}, "files": [...]}'
              rows={6}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all font-mono text-sm"
            />
            <button
              type="button"
              onClick={handleManualJsonParse}
              disabled={!manualJson.trim()}
              className={cn(
                "px-4 py-2 rounded-xl font-medium text-sm transition-all",
                !manualJson.trim()
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-violet-600 text-white hover:bg-violet-500"
              )}
            >
              Parse JSON
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="text-rose-400" size={20} />
          <p className="text-rose-400">{error}</p>
        </div>
      )}

      {parsedItem && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Series Info - Editable */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-start gap-4">
              {/* Cover Image */}
              <div className="flex-shrink-0">
                {editMode ? (
                  <div className="relative">
                    <img
                      src={seriesInfo.artworkUrl || 'https://via.placeholder.com/96?text=No+Image'}
                      alt="Cover"
                      className="w-24 h-24 rounded-xl object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96?text=No+Image';
                      }}
                    />
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImage(true);
                          try {
                            const url = await uploadImage(file);
                            setSeriesInfo({ ...seriesInfo, artworkUrl: url });
                          } catch (error) {
                            toast.error('Failed to upload image');
                          } finally {
                            setUploadingImage(false);
                          }
                        }}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <Loader2 size={20} className="text-white animate-spin" />
                      ) : (
                        <ImageIcon size={20} className="text-white" />
                      )}
                    </label>
                  </div>
                ) : (
                  <img
                    src={seriesInfo.artworkUrl || `https://archive.org/services/img/${parsedItem.identifier}`}
                    alt={seriesInfo.title}
                    className="w-24 h-24 rounded-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96?text=No+Image';
                    }}
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {editMode ? (
                    <input
                      type="text"
                      value={seriesInfo.title}
                      onChange={(e) => setSeriesInfo({ ...seriesInfo, title: e.target.value })}
                      className="text-xl font-bold text-slate-100 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 w-full"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-slate-100">
                      {seriesInfo.title}
                    </h2>
                  )}
                </div>
                
                {/* Speaker Selection */}
                {editMode && (
                  <div className="mt-3">
                    <label className="block text-sm text-slate-400 mb-2">Speaker</label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setNewSpeakerMode(false)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-colors",
                          !newSpeakerMode ? "bg-primary text-slate-900" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                        )}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSpeakerMode(true);
                          setSeriesInfo({ ...seriesInfo, speakerId: '' });
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-colors",
                          newSpeakerMode ? "bg-primary text-slate-900" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                        )}
                      >
                        <Plus size={14} className="inline mr-1" />
                        Add New
                      </button>
                    </div>
                    
                    {!newSpeakerMode ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSpeakerDropdown(!showSpeakerDropdown)}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 text-left flex items-center justify-between"
                        >
                          <span>
                            {seriesInfo.speakerId 
                              ? speakers.find(s => s.$id === seriesInfo.speakerId)?.name || 'Select speaker'
                              : 'Select a speaker'
                            }
                          </span>
                          <ChevronDown size={18} className="text-slate-400" />
                        </button>
                        
                        {showSpeakerDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl max-h-60 overflow-y-auto shadow-lg">
                            {speakers.length === 0 ? (
                              <p className="px-4 py-3 text-slate-400 text-sm">No speakers found</p>
                            ) : (
                              speakers.map(speaker => (
                                <button
                                  key={speaker.$id}
                                  type="button"
                                  onClick={() => {
                                    setSeriesInfo({ ...seriesInfo, speakerId: speaker.$id, speakerName: speaker.name });
                                    setShowSpeakerDropdown(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700/50 transition-colors",
                                    seriesInfo.speakerId === speaker.$id ? "text-primary bg-primary/10" : "text-slate-200"
                                  )}
                                >
                                  {speaker.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={seriesInfo.speakerName}
                        onChange={(e) => setSeriesInfo({ ...seriesInfo, speakerName: e.target.value, speakerId: '' })}
                        placeholder="Enter new speaker name"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
                      />
                    )}
                  </div>
                )}
                
                {!editMode && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-primary">
                      {seriesInfo.speakerId 
                        ? speakers.find(s => s.$id === seriesInfo.speakerId)?.name || seriesInfo.speakerName
                        : seriesInfo.speakerName
                      }
                    </span>
                    {seriesInfo.speakerId && (
                      <span className="text-xs text-slate-500">(existing)</span>
                    )}
                  </div>
                )}
                {editMode && (
                  <div className="mt-3">
                    <label className="block text-sm text-slate-400 mb-2">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSeriesInfo({ ...seriesInfo, category: cat })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm transition-colors",
                            seriesInfo.category === cat
                              ? "bg-primary text-slate-900"
                              : "bb-slate-700/50 text-slate-300 hover:bg-slate-700"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {editMode && (
                  <div className="mt-3">
                    <label className="block text-sm text-slate-400 mb-2">Description</label>
                    <textarea
                      value={seriesInfo.description}
                      onChange={(e) => setSeriesInfo({ ...seriesInfo, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all text-sm"
                    />
                  </div>
                )}
                {!editMode && (
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                    {seriesInfo.description?.substring(0, 200)}
                    {seriesInfo.description?.length > 200 ? '...' : ''}
                  </p>
                )}
                
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Music size={14} />
                    {parsedItem.audioFiles.length} audio files
                  </span>
                  <a
                    href={`https://archive.org/details/${parsedItem.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink size={14} />
                    View on Archive.org
                  </a>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className="text-sm text-primary hover:underline"
                >
                  {editMode ? 'Cancel' : 'Edit Info'}
                </button>
              </div>
            </div>
          </div>

          {/* File Selection */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <h3 className="font-semibold text-slate-100">
                Audio Files ({selectedFiles.size} of {parsedItem.audioFiles.length} selected)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={toggleAll}
                  className="text-sm text-primary hover:underline"
                >
                  {selectedFiles.size === parsedItem.audioFiles.length ? 'Deselect All' : 'Select All'}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles(new Set())}
                    className="text-sm text-slate-400 hover:text-slate-300"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {parsedItem.audioFiles.map((file, index) => (
                <div
                  key={index}
                  onClick={() => toggleFile(index)}
                  className={cn(
                    "flex items-center gap-4 p-4 cursor-pointer transition-colors border-b border-slate-700/30 last:border-b-0",
                    selectedFiles.has(index) ? "bg-primary/5" : "hover:bg-slate-700/30"
                  )}
                >
                  {selectedFiles.has(index) ? (
                    <CheckSquare className="text-primary" size={20} />
                  ) : (
                    <Square className="text-slate-500" size={20} />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 truncate">{file.title}</p>
                    <p className="text-xs text-slate-500 truncate">{file.name}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive size={12} />
                      {formatFileSize(file.size)}
                    </span>
                  </div>

                  <audio
                    controls
                    src={file.url}
                    className="h-8 w-32"
                    onError={(e) => {
                      (e.target as HTMLAudioElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Import Button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {seriesInfo.speakerId ? (
                <>Using existing speaker "<span className="text-primary">{speakers.find(s => s.$id === seriesInfo.speakerId)?.name}</span>"</>
              ) : (
                <>Will create new speaker "<span className="text-primary">{seriesInfo.speakerName}</span>"</>
              )}
              , series "<span className="text-slate-200">{seriesInfo.title}</span>", and {selectedFiles.size} episodes.
            </p>
            <motion.button
              whileHover={{ scale: importing ? 1 : 1.02 }}
              whileTap={{ scale: importing ? 1 : 0.98 }}
              onClick={handleImport}
              disabled={importing || selectedFiles.size === 0}
              className={cn(
                "px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all",
                importing || selectedFiles.size === 0
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-primary text-slate-900 hover:bg-primary-light"
              )}
            >
              {importing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importing {importProgress?.current}/{importProgress?.total}...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import {selectedFiles.size} Files
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
