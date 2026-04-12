import { Download, CheckCircle2, AlertCircle, Square } from 'lucide-react';
import { useDownload } from '../../hooks/useDownload';
import type { Episode, Series } from '../../types';

interface DownloadButtonProps {
  episode: Episode;
  series?: Series;
}

export function DownloadButton({ episode, series }: DownloadButtonProps) {
  const { status, progress, startDownload, cancelDownload, errorMessage } = useDownload(
    episode.$id,
    episode.audioUrl,
    episode.title,
    episode.seriesId || series?.$id,
    episode.speakerId || series?.speakerId,
    episode.duration
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'idle' || status === 'error') {
      startDownload();
    } else if (status === 'downloading') {
      cancelDownload();
    }
  };

  if (status === 'checking') {
    return <div className="w-8 h-8 flex-shrink-0" />;
  }

  if (status === 'done') {
    return (
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" title="Downloaded">
        <CheckCircle2 size={20} className="text-emerald-500" />
      </div>
    );
  }

  if (status === 'downloading') {
    return (
      <button 
        onClick={handleClick}
        className="w-8 h-8 flex items-center justify-center flex-shrink-0 relative text-primary hover:text-rose-500 transition-colors"
        title={`Downloading... ${progress}%. Click to cancel.`}
      >
        <svg className="w-8 h-8 transform -rotate-90 absolute" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="16"
            fill="transparent" stroke="currentColor" strokeWidth="2"
            className="text-slate-700"
          />
          <circle
            cx="18" cy="18" r="16"
            fill="transparent" stroke="currentColor" strokeWidth="2"
            strokeDasharray="100"
            strokeDashoffset={100 - progress}
            className="text-primary transition-all duration-300"
          />
        </svg>
        <Square size={10} className="fill-current z-10" />
      </button>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={handleClick}
        className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-rose-500 hover:text-rose-400 transition-colors"
        title={errorMessage || 'Download failed'}
      >
        <AlertCircle size={20} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-slate-500 hover:text-primary transition-colors focus:outline-none"
      title="Download Episode"
    >
      <Download size={20} />
    </button>
  );
}
