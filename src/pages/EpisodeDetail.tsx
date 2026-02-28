import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  ArrowLeft, Download, Heart, Share2,
  Clock, Calendar, ListPlus, X, SkipForward as NextIcon,
  Music2,
} from 'lucide-react';
import { getEpisodeById, getSeriesById, getEpisodesBySeries, isAppwriteConfigured } from '../lib/appwrite';
import { getPlaybackHistory, isFavorite, addFavorite, removeFavorite, getPlaylists, addToPlaylist } from '../lib/db';
import { useAudio } from '../context/AudioContext';
import { useDownloads } from '../hooks/useDownloads';
import type { Episode, Series, CurrentTrack, Playlist } from '../types';
import { formatDuration, formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';

export function EpisodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [seriesEpisodes, setSeriesEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [savedPosition, setSavedPosition] = useState(0);
  
  const { 
    play, togglePlayPause, seek, seekRelative,
    currentTrack, playerState, position, duration, playbackSpeed, setPlaybackSpeed 
  } = useAudio();
  
  const { downloading, progress, downloadEpisode, checkDownloaded, removeDownload, getLocalUrl } = useDownloads();
  const [downloaded, setDownloaded] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id || !isAppwriteConfigured()) {
        setLoading(false);
        return;
      }
      
      try {
        const episodeData = await getEpisodeById(id);
        if (episodeData) {
          setEpisode(episodeData);
          
          if (episodeData.seriesId) {
            const [seriesData, episodes] = await Promise.all([
              getSeriesById(episodeData.seriesId),
              getEpisodesBySeries(episodeData.seriesId),
            ]);
            if (seriesData) setSeries(seriesData);
            setSeriesEpisodes(episodes.filter(e => e.$id !== id));
          }
          
          const isFav = await isFavorite('episode', id);
          setFavorited(isFav);
          
          const isDownloadedAlready = await checkDownloaded(id);
          setDownloaded(isDownloadedAlready);
          
          if (isDownloadedAlready) {
            const url = await getLocalUrl(id);
            setLocalUrl(url);
          }

          const history = await getPlaybackHistory(id);
          if (history?.position) setSavedPosition(history.position);
        }
      } catch (error) {
        console.error('Failed to load episode:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id, checkDownloaded, getLocalUrl]);

  const handlePlay = async () => {
    if (!episode) return;
    
    const audioToUse = localUrl || episode.audioUrl;
    
    const track: CurrentTrack = {
      id: episode.$id,
      title: episode.title,
      audioUrl: audioToUse,
      artworkUrl: series?.artworkUrl,
      speaker: series?.title,
      duration: episode.duration,
      type: 'episode'
    };
    
    play(track, savedPosition);
  };

  const handlePlayEpisode = async (ep: Episode) => {
    const track: CurrentTrack = {
      id: ep.$id,
      title: ep.title,
      audioUrl: ep.audioUrl,
      artworkUrl: series?.artworkUrl,
      speaker: series?.title,
      duration: ep.duration,
      type: 'episode',
    };
    await play(track, 0);
    navigate('/player');
  };

  const handleOpenPlaylist = async () => {
    const pls = await getPlaylists();
    setPlaylists(pls);
    setShowPlaylistSheet(true);
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!episode) return;
    await addToPlaylist(playlistId, episode.$id);
    setShowPlaylistSheet(false);
    toast.success('Added to playlist');
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  };

  const handleDownload = async () => {
    if (!episode) return;
    
    if (downloaded) {
      await removeDownload(episode.$id);
      setDownloaded(false);
      setLocalUrl(null);
      toast.success('Download removed');
    } else {
      const success = await downloadEpisode(episode);
      if (success) {
        setDownloaded(true);
        const url = await getLocalUrl(episode.$id);
        setLocalUrl(url);
        toast.success('Episode downloaded to device');
      } else {
        toast.error('Download failed');
      }
    }
  };

  const handleFavorite = async () => {
    if (!episode) return;
    
    if (favorited) {
      await removeFavorite('episode', episode.$id);
      setFavorited(false);
    } else {
      await addFavorite({
        type: 'episode',
        itemId: episode.$id,
        title: episode.title,
        imageUrl: series?.artworkUrl,
        addedAt: new Date()
      });
      setFavorited(true);
    }
  };

  const handleShare = async () => {
    if (!episode) return;
    
    if (navigator.share) {
      await navigator.share({
        title: episode.title,
        url: window.location.href
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const savedProgressPercent = episode && episode.duration > 0 ? (savedPosition / episode.duration) * 100 : 0;
  const isCurrentEpisode = currentTrack?.id === id;

  // Next episode in the series (by episodeNumber or array order)
  const currentEpNumber = episode?.episodeNumber ?? 0;
  const nextEpisode = seriesEpisodes
    .filter(e => (e.episodeNumber ?? 0) > currentEpNumber)
    .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0))[0] ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 animate-pulse">
        <div className="h-64 bg-slate-800" />
        <div className="px-4 py-6 space-y-4">
          <div className="h-8 w-3/4 bg-slate-800 rounded" />
          <div className="h-4 w-1/2 bg-slate-800 rounded" />
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Episode not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-primary"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      <div className="relative h-64 bg-slate-800">
        {series?.artworkUrl && (
          <img
            src={series.artworkUrl}
            alt={episode.title}
            className="w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-slate-900/50 text-white"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="px-4 -mt-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 mb-4"
        >
          <h1 className="text-xl font-bold text-slate-100">{episode.title}</h1>
          {series && (
            <p className="text-sm text-primary mt-1">{series.title}</p>
          )}
          
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(episode.duration)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(episode.publishedAt)}
            </span>
            {savedPosition > 0 && !isCurrentEpisode && (
              <span className="flex items-center gap-1 text-primary">
                <Clock size={12} />
                {Math.round(savedProgressPercent)}% listened
              </span>
            )}
          </div>

          {/* Saved progress bar */}
          {savedPosition > 0 && !isCurrentEpisode && (
            <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${savedProgressPercent}%` }}
              />
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => isCurrentEpisode ? togglePlayPause() : handlePlay()}
              disabled={playerState === 'loading' && !isCurrentEpisode}
              className={cn(
                "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors",
                (isCurrentEpisode && playerState === 'playing')
                  ? "bg-slate-700 text-slate-100"
                  : "bg-primary text-slate-900 hover:bg-primary-light"
              )}
            >
              {isCurrentEpisode && playerState === 'playing' ? (
                <>
                  <Pause size={18} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={18} className="ml-0.5" />
                  <span>{isCurrentEpisode ? 'Resume' : savedPosition > 0 ? 'Resume' : 'Play'}</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleDownload}
              disabled={downloading === episode.$id}
              className={cn(
                "p-3 rounded-xl transition-colors",
                downloaded
                  ? "bg-primary/20 text-primary"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              {downloading === episode.$id ? (
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5 -rotate-90">
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="50.26"
                      strokeDashoffset={50.26 - (50.26 * progress) / 100}
                    />
                  </svg>
                </div>
              ) : (
                <Download size={20} />
              )}
            </button>
            
            <button
              onClick={handleFavorite}
              className={cn(
                "p-3 rounded-xl transition-colors",
                favorited
                  ? "bg-red-500/20 text-red-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              <Heart size={20} fill={favorited ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleOpenPlaylist}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              aria-label="Add to playlist"
            >
              <ListPlus size={20} />
            </button>
            
            <button
              onClick={handleShare}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Share2 size={20} />
            </button>
          </div>

          {/* Next Episode shortcut */}
          {nextEpisode && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => handlePlayEpisode(nextEpisode)}
              className="mt-4 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden bg-slate-700">
                {series?.artworkUrl ? (
                  <img src={series.artworkUrl} alt="" className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 size={12} className="text-slate-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Next Episode</p>
                <p className="text-xs text-slate-300 truncate group-hover:text-white transition-colors">
                  {nextEpisode.title}
                </p>
              </div>
              <NextIcon size={16} className="text-slate-500 group-hover:text-primary transition-colors flex-shrink-0" />
            </motion.button>
          )}
        </motion.div>

        {(isCurrentEpisode || position > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-xl p-4 mb-4"
          >
            <div
              className="h-2 bg-slate-700 rounded-full cursor-pointer mb-3"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
              <span>{formatDuration(position)}</span>
              <span>{formatDuration(duration || episode.duration)}</span>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => seekRelative(-30)}
                className="p-3 text-slate-400 hover:text-white transition-colors"
              >
                <SkipBack size={24} />
              </button>
              
              <button
                onClick={togglePlayPause}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  playerState === 'playing'
                    ? "bg-primary text-slate-900"
                    : "bg-slate-700 text-white"
                )}
              >
                {playerState === 'playing' ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
              </button>
              
              <button
                onClick={() => seekRelative(30)}
                className="p-3 text-slate-400 hover:text-white transition-colors"
              >
                <SkipForward size={24} />
              </button>
            </div>
            
            <div className="relative mt-4">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="w-full py-2 text-center text-sm text-slate-300 bg-slate-800 rounded-lg"
              >
                Speed: {playbackSpeed}x
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-2 glass-card rounded-lg grid grid-cols-4 gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={cn(
                        "py-2 rounded text-xs font-medium transition-colors",
                        playbackSpeed === speed
                          ? "bg-primary text-slate-900"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {episode.description && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-4 mb-4"
          >
            <h2 className="font-semibold text-slate-200 mb-2">About this episode</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {episode.description}
            </p>
          </motion.div>
        )}

        {/* Related episodes in same series */}
        {seriesEpisodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-4"
          >
            <h2 className="font-semibold text-slate-200 mb-3">More from this series</h2>
            <div className="space-y-2">
              {seriesEpisodes.slice(0, 8).map(ep => (
                <button
                  key={ep.$id}
                  onClick={() => handlePlayEpisode(ep)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left group',
                    currentTrack?.id === ep.$id
                      ? 'bg-primary/15 ring-1 ring-primary/30'
                      : 'hover:bg-slate-800/70',
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold',
                    currentTrack?.id === ep.$id ? 'bg-primary text-slate-900' : 'bg-slate-700/80 text-slate-400',
                  )}>
                    {ep.episodeNumber || <Play size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      currentTrack?.id === ep.$id ? 'text-primary font-medium' : 'text-slate-300 group-hover:text-white',
                    )}>
                      {ep.title}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">{formatDuration(ep.duration)}</p>
                  </div>
                  <Play size={13} className="text-slate-600 group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Add to Playlist bottom sheet */}
      <AnimatePresence>
        {showPlaylistSheet && (
          <>
            <motion.div
              key="ep-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-10"
              onClick={() => setShowPlaylistSheet(false)}
            />
            <motion.div
              key="ep-playlist-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 rounded-t-3xl p-6 z-20 max-h-80 overflow-y-auto"
            >
              <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                  <ListPlus size={18} className="text-primary" />
                  Add to Playlist
                </h3>
                <button
                  onClick={() => setShowPlaylistSheet(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              {playlists.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-sm">No playlists yet. Create one in the Playlists tab.</p>
              ) : (
                <div className="space-y-2">
                  {playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => handleAddToPlaylist(pl.id!)}
                      className="w-full p-3.5 rounded-xl bg-slate-800 text-slate-200 text-left hover:bg-slate-700 transition-all"
                    >
                      <span className="font-medium text-sm">{pl.name}</span>
                      {pl.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{pl.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}