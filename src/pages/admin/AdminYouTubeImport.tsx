import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Search, Loader2, Upload, AlertCircle, Music, ChevronDown, Plus, ExternalLink } from 'lucide-react';
import { cn, slugify } from '../../lib/utils';
import { toast } from 'sonner';
import { 
  createSpeaker, 
  createSeries, 
  createEpisode, 
  adminDatabases, 
  SPEAKERS_COLLECTION, 
  SERIES_COLLECTION, 
  DATABASE_ID, 
  Query 
} from '../../lib/admin';
import { getYouTubeInfo, importFromYouTube, type YouTubeVideoInfo } from '../../lib/youtube';

interface Speaker {
  $id: string;
  name: string;
  slug: string;
}

interface EditableInfo {
  title: string;
  speakerId: string;
  speakerName: string;
  seriesId: string;
  seriesTitle: string;
  description: string;
  category: string;
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

export function AdminYouTubeImport() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [series, setSeries] = useState<{ $id: string; title: string; speakerId: string }[]>([]);
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false);
  const [showSeriesDropdown, setShowSeriesDropdown] = useState(false);
  const [newSpeakerMode, setNewSpeakerMode] = useState(true);
  const [newSeriesMode, setNewSeriesMode] = useState(true);
  
  const [info, setInfo] = useState<EditableInfo>({
    title: '',
    speakerId: '',
    speakerName: '',
    seriesId: '',
    seriesTitle: '',
    description: '',
    category: 'Lectures'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (videoInfo) {
      setInfo({
        title: videoInfo.title,
        speakerId: '',
        speakerName: videoInfo.author,
        seriesId: '',
        seriesTitle: '',
        description: videoInfo.description?.substring(0, 5000) || '',
        category: 'Lectures'
      });
    }
  }, [videoInfo]);

  async function loadData() {
    try {
      const [speakersRes, seriesRes] = await Promise.all([
        adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION, [
          Query.orderAsc('name'),
          Query.limit(500)
        ]),
        adminDatabases.listDocuments(DATABASE_ID, SERIES_COLLECTION, [
          Query.orderAsc('title'),
          Query.limit(500)
        ])
      ]);
      setSpeakers(speakersRes.documents as unknown as Speaker[]);
      setSeries(seriesRes.documents as unknown as { $id: string; title: string; speakerId: string }[]);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  async function handleFetchInfo() {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const result = await getYouTubeInfo(url.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setVideoInfo(result.data);
        setInfo({
          title: result.data.title,
          speakerId: '',
          speakerName: result.data.author,
          seriesId: '',
          seriesTitle: '',
          description: result.data.description?.substring(0, 5000) || '',
          category: 'Lectures'
        });
        setNewSpeakerMode(true);
        setNewSeriesMode(true);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch video info');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!videoInfo) return;

    setImporting(true);

    try {
      let speakerId: string;

      if (info.speakerId) {
        speakerId = info.speakerId;
      } else {
        const speakerName = info.speakerName || videoInfo.author || 'Unknown Speaker';
        const speakerSlug = slugify(speakerName);
        const existingSpeakers = await adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION, [
          Query.equal('slug', speakerSlug),
          Query.limit(1)
        ]);

        if (existingSpeakers.documents.length > 0) {
          speakerId = existingSpeakers.documents[0].$id;
        } else {
          speakerId = await createSpeaker({
            name: speakerName,
            slug: speakerSlug,
            bio: '',
            imageUrl: videoInfo.thumbnail,
            featured: false
          });
          await loadData();
        }
      }

      let seriesId: string | undefined;

      if (info.seriesId) {
        seriesId = info.seriesId;
      } else if (info.seriesTitle) {
        const seriesSlug = slugify(info.seriesTitle);
        const existingSeries = await adminDatabases.listDocuments(DATABASE_ID, SERIES_COLLECTION, [
          Query.equal('slug', seriesSlug),
          Query.limit(1)
        ]);

        if (existingSeries.documents.length > 0) {
          seriesId = existingSeries.documents[0].$id;
        } else {
          seriesId = await createSeries({
            title: info.seriesTitle,
            slug: seriesSlug,
            speakerId: speakerId,
            description: info.description?.substring(0, 5000) || '',
            artworkUrl: videoInfo.thumbnail,
            category: info.category,
            episodeCount: 1
          });
          await loadData();
        }
      }

      const downloadResult = await importFromYouTube(url.trim(), info.title || videoInfo.title);
      
      if (!downloadResult.success || !downloadResult.data) {
        throw new Error(downloadResult.error || 'Download failed');
      }

      await createEpisode({
        title: info.title || videoInfo.title,
        slug: slugify(`youtube-${videoInfo.id}`),
        seriesId: seriesId,
        audioUrl: downloadResult.data.url,
        duration: videoInfo.duration,
        description: info.description?.substring(0, 5000) || '',
        episodeNumber: 1,
        publishedAt: new Date().toISOString(),
        isStandalone: !seriesId
      });

      toast.success('Episode imported successfully!');
      setVideoInfo(null);
      setUrl('');
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Failed to import');
    } finally {
      setImporting(false);
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Import from YouTube</h1>
        <p className="text-slate-400 mt-1">Import audio from YouTube videos as podcast episodes</p>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">YouTube URL</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Youtube size={18} />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFetchInfo}
                disabled={loading || !url.trim()}
                className={cn(
                  "px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all",
                  loading || !url.trim()
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-primary text-slate-900 hover:bg-primary-light"
                )}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {loading ? 'Fetching...' : 'Fetch Info'}
              </motion.button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Paste any YouTube video URL to extract audio and metadata
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="text-rose-400" size={20} />
          <p className="text-rose-400">{error}</p>
        </div>
      )}

      {videoInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Video Preview */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-32 h-20 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128x72?text=No+Thumbnail';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-100 line-clamp-2">
                  {videoInfo.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-primary text-sm">{videoInfo.author}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 text-sm">{formatDuration(videoInfo.duration)}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Music size={12} />
                    Audio only
                  </span>
                  <a
                    href={`https://youtube.com/watch?v=${videoInfo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink size={12} />
                    Watch on YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Episode Details Form */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-4">
            <h3 className="font-semibold text-slate-100">Episode Details</h3>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Title</label>
              <input
                type="text"
                value={info.title}
                onChange={(e) => setInfo({ ...info, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Description</label>
              <textarea
                value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Speaker</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewSpeakerMode(false);
                    setInfo({ ...info, speakerId: '', speakerName: '' });
                  }}
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
                    setInfo({ ...info, speakerId: '' });
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
                      {info.speakerId
                        ? speakers.find(s => s.$id === info.speakerId)?.name || 'Select speaker'
                        : 'Select a speaker'}
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
                              setInfo({ ...info, speakerId: speaker.$id, speakerName: speaker.name });
                              setShowSpeakerDropdown(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700/50 transition-colors",
                              info.speakerId === speaker.$id ? "text-primary bg-primary/10" : "text-slate-200"
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
                  value={info.speakerName}
                  onChange={(e) => setInfo({ ...info, speakerName: e.target.value, speakerId: '' })}
                  placeholder="Enter new speaker name"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
                />
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Series (Optional)</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewSeriesMode(false);
                    setInfo({ ...info, seriesId: '', seriesTitle: '' });
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    !newSeriesMode ? "bg-primary text-slate-900" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewSeriesMode(true);
                    setInfo({ ...info, seriesId: '' });
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    newSeriesMode ? "bg-primary text-slate-900" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  <Plus size={14} className="inline mr-1" />
                  Add New
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewSeriesMode(true);
                    setInfo({ ...info, seriesId: '', seriesTitle: '' });
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    !info.seriesId && !info.seriesTitle ? "bg-violet-600 text-white" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  Standalone
                </button>
              </div>

              {!newSeriesMode ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSeriesDropdown(!showSeriesDropdown)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 text-left flex items-center justify-between"
                  >
                    <span>
                      {info.seriesId
                        ? series.find(s => s.$id === info.seriesId)?.title || 'Select series'
                        : 'Select a series'}
                    </span>
                    <ChevronDown size={18} className="text-slate-400" />
                  </button>

                  {showSeriesDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl max-h-60 overflow-y-auto shadow-lg">
                      {series.length === 0 ? (
                        <p className="px-4 py-3 text-slate-400 text-sm">No series found</p>
                      ) : (
                        series.map(s => (
                          <button
                            key={s.$id}
                            type="button"
                            onClick={() => {
                              setInfo({ ...info, seriesId: s.$id, seriesTitle: s.title });
                              setShowSeriesDropdown(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700/50 transition-colors",
                              info.seriesId === s.$id ? "text-primary bg-primary/10" : "text-slate-200"
                            )}
                          >
                            {s.title}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={info.seriesTitle}
                  onChange={(e) => setInfo({ ...info, seriesTitle: e.target.value, seriesId: '' })}
                  placeholder="Leave empty for standalone episode"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50"
                />
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setInfo({ ...info, category: cat })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm transition-colors",
                      info.category === cat
                        ? "bg-primary text-slate-900"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <p>Ready to import as:</p>
              <p className="text-slate-300 mt-1">
                <span className="text-primary">{info.title || videoInfo.title}</span>
                {info.seriesTitle && (
                  <span className="text-slate-500"> in </span>
                )}
                {info.seriesTitle && (
                  <span className="text-slate-200">{info.seriesTitle}</span>
                )}
                {info.speakerName && (
                  <>
                    <span className="text-slate-500"> by </span>
                    <span className="text-primary">{info.speakerName}</span>
                  </>
                )}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: importing ? 1 : 1.02 }}
              whileTap={{ scale: importing ? 1 : 0.98 }}
              onClick={handleImport}
              disabled={importing}
              className={cn(
                "px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all",
                importing
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-primary text-slate-900 hover:bg-primary-light"
              )}
            >
              {importing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import Episode
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      {!videoInfo && (
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30">
          <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
            <Youtube size={18} className="text-red-500" />
            YouTube Import Notes
          </h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Audio is extracted and uploaded to your Appwrite storage
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Maximum file size: 100MB (about 1-2 hours of audio)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Video metadata (title, description, thumbnail) is automatically fetched
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Ensure the Appwrite function is deployed and configured
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
