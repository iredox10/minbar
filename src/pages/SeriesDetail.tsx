import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Clock, Download, Heart, Share2, ListChecks, X, CheckCircle2, Loader2 } from 'lucide-react';
import { getSeriesById, getEpisodesBySeries, getRelatedSeries, isAppwriteConfigured } from '../lib/appwrite';
import { isFavorite, addFavorite, removeFavorite, isDownloaded, getDownload } from '../lib/db';
import type { Series, Episode, CurrentTrack, QueueItem } from '../types';
import { useAudio } from '../context/AudioContext';
import { useDownloads } from '../hooks/useDownloads';
import { formatDuration, formatDate, cn } from '../lib/utils';
import { DownloadButton } from '../components/audio/DownloadButton';
import { useTranslation } from '../hooks/useTranslation';
import { toast } from 'sonner';

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

export function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [relatedSeries, setRelatedSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [showDownloadQueue, setShowDownloadQueue] = useState(false);

  const { play, setQueue, currentTrack, playerState } = useAudio();
  const { addToQueue, queue, queueProgress, isQueueRunning, processQueue, clearQueue } = useDownloads();

  useEffect(() => {
    async function loadSeries() {
      if (!id || !isAppwriteConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const [seriesData, episodesData] = await Promise.all([
          getSeriesById(id),
          getEpisodesBySeries(id)
        ]);
        setSeries(seriesData);
        setEpisodes(episodesData);

        if (seriesData) {
          const fav = await isFavorite('series', seriesData.$id);
          setIsFav(fav);
          
          if (seriesData.tags && seriesData.tags.length > 0) {
            getRelatedSeries(seriesData.tags, seriesData.$id).then(setRelatedSeries);
          }
        }

        const downloaded = new Set<string>();
        await Promise.all(
          episodesData.map(async (ep) => {
            const isDl = await isDownloaded(ep.$id);
            if (isDl) downloaded.add(ep.$id);
          })
        );
        setDownloadedIds(downloaded);
      } catch (error) {
        console.error('Failed to load series:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!series) return;
    
    if (isFav) {
      await removeFavorite('series', series.$id);
      setIsFav(false);
    } else {
      await addFavorite({
        type: 'series',
        itemId: series.$id,
        title: series.title,
        imageUrl: series.artworkUrl,
        addedAt: new Date()
      });
      setIsFav(true);
    }
  };

  const handlePlayEpisode = async (episode: Episode, startIndex?: number) => {
    if (!series) return;
    
    const download = await getDownload(episode.$id);
    const audioToUse = download?.localBlobUrl || episode.audioUrl;
    
    const track: CurrentTrack = {
      id: episode.$id,
      title: episode.title,
      audioUrl: audioToUse,
      artworkUrl: series.artworkUrl,
      speaker: series.title,
      duration: episode.duration,
      type: 'episode',
      seriesId: series.$id,
      episodeNumber: episode.episodeNumber,
    };

    const queueItems: QueueItem[] = episodes.map(ep => ({
      id: ep.$id,
      title: ep.title,
      audioUrl: ep.audioUrl,
      artworkUrl: series.artworkUrl,
      speaker: series.title,
      duration: ep.duration,
      type: 'episode' as const,
      seriesId: series.$id,
      episodeNumber: ep.episodeNumber,
    }));

    const episodeIndex = startIndex ?? episodes.findIndex(ep => ep.$id === episode.$id);
    setQueue(queueItems, episodeIndex >= 0 ? episodeIndex : 0);
    play(track);
  };

  const handlePlayAll = () => {
    if (episodes.length > 0 && series) {
      handlePlayEpisode(episodes[0], 0);
    }
  };

  const handleShare = async () => {
    if (!series) return;
    const shareUrl = window.location.href;
    const shareData = {
      title: series.title,
      text: `Check out "${series.title}" on Arewa Central`,
      url: shareUrl
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    }
  };

  const handleShareEpisode = async (episode: Episode) => {
    const shareUrl = `${window.location.origin}/podcasts/episode/${episode.$id}`;
    const shareData = {
      title: episode.title,
      text: `Listen to "${episode.title}" on Arewa Central`,
      url: shareUrl
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    }
  };

  const isPlaying = (episodeId: string) => currentTrack?.id === episodeId && playerState === 'playing';

  const handleDownloadAll = () => {
    const notDownloaded = episodes.filter(ep => !downloadedIds.has(ep.$id));
    if (notDownloaded.length > 0) {
      addToQueue(notDownloaded);
      setShowDownloadQueue(true);
    }
  };

  const handleProcessQueue = async () => {
    await processQueue();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 animate-pulse space-y-6">
        <div className="aspect-square w-48 mx-auto rounded-2xl skeleton" />
        <div className="space-y-2">
          <div className="h-6 w-3/4 skeleton rounded mx-auto" />
          <div className="h-4 w-1/2 skeleton rounded mx-auto" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-400 text-lg">{t('seriesNotFound')}</p>
          <Link to="/" className="text-primary mt-2 inline-block">
            {t('goHome')}
          </Link>
        </div>
      </div>
    );
  }

  const totalDuration = episodes.reduce((acc, ep) => acc + ep.duration, 0);

  return (
    <div className="min-h-screen">
      <div className="relative">
        <div className="absolute inset-0 h-72">
          <img
            src={series.artworkUrl}
            alt={series.title}
            className="w-full h-full object-cover opacity-30 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/80 to-slate-900" />
        </div>

        <div className="relative px-4 pt-4">
          <Link 
            to="/podcasts" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>{t('back')}</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center mb-6"
          >
            <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-2xl mb-4 ring-2 ring-slate-700">
              <img
                src={series.artworkUrl}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            </div>

            <h1 className="text-2xl font-bold text-slate-100 mb-2">{series.title}</h1>

            {series.description && (
              <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-4">
                {series.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Play size={14} />
                {episodes.length} {t('episodesCount')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {formatDuration(totalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlayAll}
                className="px-6 py-3 bg-primary text-slate-900 font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/30"
              >
                <Play size={18} />
                {t('playAll')}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadAll}
                className="px-4 py-3 bg-slate-800 text-slate-200 font-semibold rounded-xl flex items-center gap-2 shadow-lg hover:bg-slate-700 transition-colors"
              >
                <ListChecks size={18} />
                {t('downloadAll') || 'Download All'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleFavorite}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  isFav ? "bg-primary/20 text-primary" : "bg-slate-800 text-slate-400"
                )}
              >
                <Heart size={20} fill={isFav ? "currentColor" : "none"} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="p-3 rounded-xl bg-slate-800 text-slate-400"
              >
                <Share2 size={20} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-24">
        {episodes.length > 0 ? (
          <motion.section
            variants={container}
            initial="hidden"
            animate="show"
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-slate-100 mb-4">{t('episodes')}</h2>

            <div className="space-y-3">
              {episodes.map((episode, index) => (
                <motion.div
                  key={episode.$id}
                  variants={item}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "glass-card rounded-2xl p-4 group cursor-pointer",
                    isPlaying(episode.$id) && "border-primary/50 bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-slate-600 text-sm font-mono w-6 text-center">
                      {episode.episodeNumber || index + 1}
                    </span>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handlePlayEpisode(episode, index)}
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all relative overflow-hidden",
                        isPlaying(episode.$id)
                          ? "bg-primary text-slate-900 shadow-lg shadow-primary/30"
                          : "bg-slate-800 text-slate-300 group-hover:bg-primary group-hover:text-slate-900"
                      )}
                    >
                      <Play size={16} className="ml-0.5" />
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <Link to={`/podcasts/episode/${episode.$id}`}>
                        <p className="font-medium text-slate-100 truncate group-hover:text-primary transition-colors">
                          {episode.title}
                        </p>
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDuration(episode.duration)}
                        </span>
                        {episode.publishedAt && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span>{formatDate(episode.publishedAt)}</span>
                          </>
                        )}
                        {downloadedIds.has(episode.$id) && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Download size={10} />
                              {t('downloaded')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleShareEpisode(episode);
                        }}
                        className="p-2.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-800/50 transition-colors"
                        aria-label="Share episode"
                      >
                        <Share2 size={14} />
                      </button>
                      <DownloadButton episode={episode} series={series} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ) : (
          <div className="text-center py-12">
            <Play className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">{t('noEpisodesAvailableYet')}</p>
          </div>
        )}

        {relatedSeries.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-slate-100 mb-4">{t('relatedSeries')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {relatedSeries.map(s => (
                <Link
                  key={s.$id}
                  to={`/podcasts/series/${s.$id}`}
                  className="glass-card p-3 rounded-2xl group hover:bg-slate-800/70 transition-colors"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-3">
                    <img
                      src={s.artworkUrl}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="font-semibold text-slate-200 text-sm truncate">{s.title}</h3>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* Download Queue Modal */}
      <AnimatePresence>
        {showDownloadQueue && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowDownloadQueue(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 rounded-t-3xl p-6 z-50 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                  <ListChecks size={18} className="text-primary" />
                  Download Queue
                </h3>
                <button
                  onClick={() => setShowDownloadQueue(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {queue.length > 0 && (
                <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">
                      {queueProgress.completed} / {queueProgress.total} episodes
                    </span>
                    {isQueueRunning ? (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Downloading...
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Complete
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(queueProgress.completed / queueProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {queue.map((ep, i) => {
                  const isDone = i < queueProgress.completed;
                  const isCurrent = i === queueProgress.current - 1 && isQueueRunning;
                  return (
                    <div
                      key={ep.$id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl",
                        isDone ? "bg-emerald-500/10" : isCurrent ? "bg-primary/10" : "bg-slate-800/50"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <Download size={16} className="text-slate-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{ep.title}</p>
                        <p className="text-[10px] text-slate-500">{formatDuration(ep.duration)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    clearQueue();
                    setShowDownloadQueue(false);
                  }}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                {!isQueueRunning && queue.length > 0 && (
                  <button
                    onClick={handleProcessQueue}
                    className="flex-1 py-3 bg-primary text-slate-900 rounded-xl font-medium hover:bg-primary-light transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Start Download
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}