import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Play, Heart, Radio, TrendingUp, Clock, Activity } from 'lucide-react';
import { getAdminStats } from '../../lib/admin';
import { cn } from '../../lib/utils';

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

interface Stats {
  speakersCount: number;
  seriesCount: number;
  episodesCount: number;
  duasCount: number;
  radioCount: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    speakersCount: 0,
    seriesCount: 0,
    episodesCount: 0,
    duasCount: 0,
    radioCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const data = await getAdminStats();
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, []);

  const statCards = [
    { label: 'Total Speakers', value: stats.speakersCount, icon: Users, color: 'bg-primary', change: '+2 this week' },
    { label: 'Total Series', value: stats.seriesCount, icon: BookOpen, color: 'bg-emerald-500', change: '+5 this week' },
    { label: 'Total Episodes', value: stats.episodesCount, icon: Play, color: 'bg-violet-500', change: '+12 this week' },
    { label: 'Duas', value: stats.duasCount, icon: Heart, color: 'bg-rose-500', change: 'Updated daily' },
    { label: 'Radio Stations', value: stats.radioCount, icon: Radio, color: 'bg-amber-500', change: 'Live streams' }
  ];

  const quickActions = [
    { label: 'Add Speaker', href: '/admin/speakers/new', icon: Users },
    { label: 'Add Series', href: '/admin/series/new', icon: BookOpen },
    { label: 'Add Episode', href: '/admin/episodes/new', icon: Play },
    { label: 'Add Dua', href: '/admin/duas/new', icon: Heart }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back! Here's your content overview.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-slate-700 mb-4" />
              <div className="h-8 w-16 bg-slate-700 rounded mb-2" />
              <div className="h-4 w-24 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
        >
          {statCards.map((stat) => (
            <motion.div
              key={stat.label}
              variants={item}
              className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600 transition-all"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.color)}>
                <stat.icon size={20} className="text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              <p className="text-xs text-slate-500 mt-2">{stat.change}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-slate-100">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <motion.a
                key={action.label}
                href={action.href}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-all"
              >
                <action.icon size={18} className="text-primary" />
                <span className="text-sm text-slate-200">{action.label}</span>
              </motion.a>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-100">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {[
              { action: 'New episode added', time: '2 hours ago', type: 'episode' },
              { action: 'Speaker profile updated', time: '5 hours ago', type: 'speaker' },
              { action: 'New series created', time: '1 day ago', type: 'series' },
              { action: 'Dua collection updated', time: '2 days ago', type: 'dua' }
            ].map((activity) => (
              <div key={activity.action} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  activity.type === 'episode' && "bg-violet-400",
                  activity.type === 'speaker' && "bg-primary",
                  activity.type === 'series' && "bg-emerald-400",
                  activity.type === 'dua' && "bg-rose-400"
                )} />
                <span className="text-sm text-slate-300">{activity.action}</span>
                <span className="text-xs text-slate-500 ml-auto">{activity.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-violet-400" />
          <h2 className="text-lg font-semibold text-slate-100">Content Guidelines</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-700/30 rounded-xl">
            <h3 className="font-medium text-slate-200 mb-2">Speaker Images</h3>
            <p className="text-sm text-slate-400">Use square images (512x512px) for best quality in speaker profiles.</p>
          </div>
          <div className="p-4 bg-slate-700/30 rounded-xl">
            <h3 className="font-medium text-slate-200 mb-2">Audio Files</h3>
            <p className="text-sm text-slate-400">MP3 format recommended. Keep file sizes under 50MB for faster loading.</p>
          </div>
          <div className="p-4 bg-slate-700/30 rounded-xl">
            <h3 className="font-medium text-slate-200 mb-2">Series Artwork</h3>
            <p className="text-sm text-slate-400">Use square images (1000x1000px) for series and episode covers.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}