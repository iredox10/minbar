import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  ArrowLeft, Download, Heart, Share2,
  Clock, Calendar
} from 'lucide-react';
import { getEpisodeById, getSeriesById, isAppwriteConfigured } from '../lib/appwrite';
import { getPlaybackHistory, isFavorite, addFavorite, removeFavorite } from '../lib/db';
import { useAudio } from '../context/AudioContext';
import { useDownloads } from '../hooks/useDownloads';
import type { Episode, Series, CurrentTrack } from '../types';
import { formatDuration, formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';

export function EpisodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
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
            const seriesData = await getSeriesById(episodeData.seriesId);
            if (seriesData) setSeries(seriesData);
          }
          
          const isFav = await isFavorite('episode', id);
          setFavorited(isFav);
          
          const isDownloadedAlready = await checkDownloaded(id);
          setDownloaded(isDownloadedAlready);
          
          if (isDownloadedAlready) {
            const url = await getLocalUrl(id);
            setLocalUrl(url);
          }
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
    
    const history = await getPlaybackHistory(episode.$id);
    const startPos = history?.position || 0;
    play(track, startPos);
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
  const isCurrentEpisode = currentTrack?.id === id;

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
          </div>
          
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
                  <span>{isCurrentEpisode ? 'Resume' : 'Play'}</span>
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
              onClick={handleShare}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Share2 size={20} />
            </button>
          </div>
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
            className="glass-card rounded-xl p-4"
          >
            <h2 className="font-semibold text-slate-200 mb-2">About this episode</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {episode.description}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}