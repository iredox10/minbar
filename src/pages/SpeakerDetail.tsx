import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Play, Clock, Music } from 'lucide-react';
import { getSpeakerBySlug, getSeriesBySpeaker, getStandaloneEpisodesBySpeaker, isAppwriteConfigured } from '../lib/appwrite';
import { useAudio } from '../context/AudioContext';
import type { Speaker, Series, Episode, CurrentTrack } from '../types';
import { formatDuration, cn } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function SpeakerDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [standaloneEpisodes, setStandaloneEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { play, currentTrack, playerState } = useAudio();

  useEffect(() => {
    async function loadSpeaker() {
      if (!slug || !isAppwriteConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const speakerData = await getSpeakerBySlug(slug);
        if (speakerData) {
          setSpeaker(speakerData);
          const [seriesData, episodesData] = await Promise.all([
            getSeriesBySpeaker(speakerData.$id),
            getStandaloneEpisodesBySpeaker(speakerData.$id)
          ]);
          setSeries(seriesData);
          setStandaloneEpisodes(episodesData);
        }
      } catch (error) {
        console.error('Failed to load speaker:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSpeaker();
  }, [slug]);

  const handlePlayEpisode = (episode: Episode) => {
    if (!speaker) return;
    const track: CurrentTrack = {
      id: episode.$id,
      title: episode.title,
      audioUrl: episode.audioUrl,
      artworkUrl: speaker.imageUrl,
      speaker: speaker.name,
      duration: episode.duration,
      type: 'episode'
    };
    play(track);
  };

  const isPlaying = (episodeId: string) => currentTrack?.id === episodeId && playerState === 'playing';

  if (loading) {
    return (
      <div className="min-h-screen p-4 animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full skeleton" />
          <div className="space-y-2">
            <div className="h-6 w-40 skeleton rounded" />
            <div className="h-4 w-60 skeleton rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-400 text-lg">Speaker not found</p>
          <Link to="/podcasts/speakers" className="text-primary mt-2 inline-block">
            Browse all speakers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="relative">
        <div className="absolute inset-0 h-64 bg-gradient-to-b from-primary/20 to-transparent" />
        
        <div className="relative px-4 pt-4">
          <Link 
            to="/podcasts/speakers" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span>All Speakers</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl" />
              <img
                src={speaker.imageUrl}
                alt={speaker.name}
                className="relative w-28 h-28 rounded-full object-cover ring-4 ring-slate-800"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-100 mb-2">{speaker.name}</h1>
            
            {speaker.bio && (
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                {speaker.bio}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-8">
        {/* Standalone Audio */}
        {standaloneEpisodes.length > 0 && (
          <motion.section
            variants={container}
            initial="hidden"
            animate="show"
          >
            <div className="flex items-center gap-2 mb-5">
              <Music size={18} className="text-violet-400" />
              <h2 className="text-lg font-semibold text-slate-100">
                Audio ({standaloneEpisodes.length})
              </h2>
            </div>

            <div className="space-y-3">
              {standaloneEpisodes.map((episode) => (
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
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handlePlayEpisode(episode)}
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
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
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Series */}
        {series.length > 0 && (
          <motion.section
            variants={container}
            initial="hidden"
            animate="show"
          >
            <div className="flex items-center gap-2 mb-5">
              <BookOpen size={18} className="text-primary" />
              <h2 className="text-lg font-semibold text-slate-100">
                Series ({series.length})
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {series.map((s, index) => (
                <motion.div
                  key={s.$id}
                  variants={item}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={`/podcasts/series/${s.$id}`}
                    className="block group"
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden glass-card geometric-border">
                      <img
                        src={s.artworkUrl}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="font-semibold text-slate-100 line-clamp-2 group-hover:text-primary transition-colors">
                          {s.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Play size={10} />
                          {s.episodeCount} episodes
                        </p>
                      </div>
                      {index === 0 && (
                        <div className="absolute top-3 left-3 px-2 py-1 bg-primary/90 rounded-lg text-xs font-medium text-slate-900">
                          Featured
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {series.length === 0 && standaloneEpisodes.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No content available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}