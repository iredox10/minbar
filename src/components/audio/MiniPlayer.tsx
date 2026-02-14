import { useAudio } from '../../context/AudioContext';
import { formatDuration, cn } from '../../lib/utils';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MiniPlayer() {
  const {
    currentTrack,
    playerState,
    position,
    duration,
    togglePlayPause,
    seek,
    stop
  } = useAudio();

  const navigate = useNavigate();

  if (!currentTrack || playerState === 'idle') {
    return null;
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const isLoading = playerState === 'loading';

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  };

  const handleOpenPlayer = () => {
    if (currentTrack.type === 'episode') {
      navigate(`/podcasts/episode/${currentTrack.id}`);
    } else if (currentTrack.type === 'radio') {
      navigate('/radio');
    } else if (currentTrack.type === 'dua') {
      navigate(`/duas/${currentTrack.id}`);
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 animate-slide-up">
      <div
        className="mx-2 glass-card rounded-2xl overflow-hidden shadow-lg cursor-pointer"
        onClick={handleOpenPlayer}
      >
        <div
          className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
          onClick={(e) => {
            e.stopPropagation();
            handleProgressClick(e);
          }}
        />
        
        <div className="p-3 flex items-center gap-3">
          {currentTrack.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
              <span className="text-primary text-lg">MC</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentTrack.speaker || 'Muslim Central'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-500 tabular-nums">
                {formatDuration(position)}
              </span>
              <span className="text-[10px] text-slate-600">/</span>
              <span className="text-[10px] text-slate-500 tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                seek(position - 15);
              }}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <SkipBack size={18} />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              disabled={isLoading}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isLoading
                  ? "bg-slate-700 text-slate-400"
                  : "bg-primary text-slate-900 hover:bg-primary-light"
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : playerState === 'playing' ? (
                <Pause size={18} />
              ) : (
                <Play size={18} className="ml-0.5" />
              )}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                seek(position + 30);
              }}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <SkipForward size={18} />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                stop();
              }}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}