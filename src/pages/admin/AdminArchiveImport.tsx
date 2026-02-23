import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, CheckSquare, Square, Upload, ExternalLink, AlertCircle, Music, Clock, HardDrive } from 'lucide-react';
import { fetchArchiveMetadata, parseArchiveItem, type ParsedArchiveItem } from '../../lib/archive';
import { createSpeaker, createSeries, createEpisode, adminDatabases, SPEAKERS_COLLECTION, SERIES_COLLECTION, DATABASE_ID, Query } from '../../lib/admin';
import { cn, slugify } from '../../lib/utils';
import { toast } from 'sonner';

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

  async function handleFetch() {
    if (!identifier.trim()) return;
    
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
      
      // Log the actual structure
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
    if (!manualJson.trim()) return;
    
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
      setSelectedFiles(new Set(parsed.audioFiles.map((_, i) => i)));
      setError(null);
      setShowManualInput(false);
      setManualJson('');
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  }

  async function handleImport() {
    if (!parsedItem || selectedFiles.size === 0) return;
    
    setImporting(true);
    setImportProgress({ current: 0, total: selectedFiles.size });
    
    try {
      // Find or create speaker
      let speakerId: string | undefined;
      const speakerSlug = slugify(parsedItem.creator);
      
      const existingSpeakers = await adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION, [
        Query.equal('slug', speakerSlug),
        Query.limit(1)
      ]);
      
      if (existingSpeakers.documents.length > 0) {
        speakerId = existingSpeakers.documents[0].$id;
      } else {
        speakerId = await createSpeaker({
          name: parsedItem.creator,
          slug: speakerSlug,
          bio: '',
          imageUrl: `https://archive.org/services/img/${parsedItem.identifier}`,
          featured: false
        });
      }

      // Find or create series
      let seriesId: string | undefined;
      const seriesSlug = slugify(parsedItem.title);
      
      const existingSeries = await adminDatabases.listDocuments(DATABASE_ID, SERIES_COLLECTION, [
        Query.equal('slug', seriesSlug),
        Query.limit(1)
      ]);
      
      if (existingSeries.documents.length > 0) {
        seriesId = existingSeries.documents[0].$id;
      } else {
        seriesId = await createSeries({
          title: parsedItem.title,
          slug: seriesSlug,
          speakerId: speakerId,
          description: parsedItem.description?.substring(0, 5000) || '',
          artworkUrl: `https://archive.org/services/img/${parsedItem.identifier}`,
          category: 'Lectures',
          episodeCount: selectedFiles.size
        });
      }

      // Import selected audio files as episodes
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
          {/* Series Info */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-start gap-4">
              <img
                src={`https://archive.org/services/img/${parsedItem.identifier}`}
                alt={parsedItem.title}
                className="w-24 h-24 rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96?text=No+Image';
                }}
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-100">{parsedItem.title}</h2>
                <p className="text-primary mt-1">{parsedItem.creator}</p>
                {parsedItem.description && (
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">{parsedItem.description}</p>
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
            </div>
          </div>

          {/* File Selection */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <h3 className="font-semibold text-slate-100">
                Audio Files ({selectedFiles.size} of {parsedItem.audioFiles.length} selected)
              </h3>
              <button
                onClick={toggleAll}
                className="text-sm text-primary hover:underline"
              >
                {selectedFiles.size === parsedItem.audioFiles.length ? 'Deselect All' : 'Select All'}
              </button>
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
              This will create a speaker, series, and {selectedFiles.size} episodes.
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
