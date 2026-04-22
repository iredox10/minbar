import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Clock, TrendingUp, Calendar, Headphones, Award, CheckCircle } from 'lucide-react';
import { getRecentHistory } from '../lib/db';
import type { PlaybackHistory } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { formatDuration, cn } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};

interface WeekData {
  label: string;
  minutes: number;
}

interface SpeakerStat {
  name: string;
  count: number;
  minutes: number;
}

export function Stats() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<PlaybackHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getRecentHistory(200);
        setHistory(data);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    let filtered = history;
    if (period === 'week') {
      filtered = history.filter(h => now - new Date(h.playedAt).getTime() < weekMs);
    } else if (period === 'month') {
      filtered = history.filter(h => now - new Date(h.playedAt).getTime() < monthMs);
    }

    const totalMinutes = Math.round(filtered.reduce((acc, h) => {
      const listened = Math.min(h.position, h.duration);
      return acc + (listened / 60);
    }, 0));

    const completedCount = filtered.filter(h => h.completed).length;
    const uniqueEpisodes = new Set(filtered.map(h => h.episodeId)).size;

    // Weekly breakdown for chart
    const weekData: WeekData[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayMinutes = filtered
        .filter(h => {
          const playedAt = new Date(h.playedAt).getTime();
          return playedAt >= dayStart.getTime() && playedAt < dayEnd.getTime();
        })
        .reduce((acc, h) => acc + Math.min(h.position, h.duration) / 60, 0);

      weekData.push({
        label: dayNames[dayStart.getDay()],
        minutes: Math.round(dayMinutes)
      });
    }

    // Speaker stats
    const speakerMap = new Map<string, SpeakerStat>();
    filtered.forEach(h => {
      const name = h.speaker || 'Unknown';
      const existing = speakerMap.get(name) || { name, count: 0, minutes: 0 };
      existing.count++;
      existing.minutes += Math.min(h.position, h.duration) / 60;
      speakerMap.set(name, existing);
    });

    const topSpeakers = Array.from(speakerMap.values())
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    return {
      totalMinutes,
      completedCount,
      uniqueEpisodes,
      weekData,
      topSpeakers,
      totalSessions: filtered.length
    };
  }, [history, period]);

  const maxWeekMinutes = Math.max(...stats.weekData.map(d => d.minutes), 1);

  if (loading) {
    return (
      <div className="min-h-screen p-4 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-48 bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            {t('listeningStats') || 'Listening Stats'}
          </h1>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          {(['week', 'month', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all capitalize",
                period === p
                  ? "bg-primary text-slate-900"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              )}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Summary Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3"
        >
          <motion.div variants={item} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-primary" />
              <span className="text-xs text-slate-400">Listening Time</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">
              {stats.totalMinutes >= 60 
                ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
                : `${stats.totalMinutes}m`
              }
            </p>
          </motion.div>

          <motion.div variants={item} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Headphones size={16} className="text-violet-400" />
              <span className="text-xs text-slate-400">Episodes</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{stats.uniqueEpisodes}</p>
          </motion.div>

          <motion.div variants={item} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-xs text-slate-400">Completed</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{stats.completedCount}</p>
          </motion.div>

          <motion.div variants={item} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-400" />
              <span className="text-xs text-slate-400">Sessions</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{stats.totalSessions}</p>
          </motion.div>
        </motion.div>

        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-primary" />
            <h2 className="font-semibold text-slate-100">Daily Activity</h2>
          </div>

          <div className="flex items-end justify-between gap-2 h-32">
            {stats.weekData.map((day, i) => (
              <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400">
                  {day.minutes > 0 ? `${day.minutes}m` : ''}
                </span>
                <div className="w-full bg-slate-700/50 rounded-t-lg relative overflow-hidden" style={{ height: '100px' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.minutes / maxWeekMinutes) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/60 rounded-t-lg"
                  />
                </div>
                <span className="text-[10px] text-slate-500">{day.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Speakers */}
        {stats.topSpeakers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-amber-400" />
              <h2 className="font-semibold text-slate-100">Top Speakers</h2>
            </div>

            <div className="space-y-3">
              {stats.topSpeakers.map((speaker, i) => (
                <div key={speaker.name} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-500 w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{speaker.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(speaker.minutes / stats.topSpeakers[0].minutes) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {Math.round(speaker.minutes)}m
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {stats.totalMinutes === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">No listening data yet</p>
            <p className="text-sm text-slate-500 mt-2">Start listening to see your stats</p>
            <Link 
              to="/"
              className="inline-block mt-4 px-6 py-3 bg-primary text-slate-900 font-medium rounded-xl"
            >
              Browse Episodes
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
