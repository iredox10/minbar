import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Play } from 'lucide-react';
import { getSpeakerBySlug, getSeriesBySpeaker, isAppwriteConfigured } from '../lib/appwrite';
import type { Speaker, Series } from '../types';

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
  const [loading, setLoading] = useState(true);

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
          const seriesData = await getSeriesBySpeaker(speakerData.$id);
          setSeries(seriesData);
        }
      } catch (error) {
        console.error('Failed to load speaker:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSpeaker();
  }, [slug]);

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

      <div className="px-4 pb-24">
        {series.length > 0 ? (
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
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No series available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}