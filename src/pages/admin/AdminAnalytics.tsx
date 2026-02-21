import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Play, Download, Search, Heart, TrendingUp, Clock, Activity } from 'lucide-react';
import { getAnalyticsStats } from '../../lib/analytics';
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

const COLORS = ['#00D9FF', '#A855F7', '#22C55E', '#F59E0B', '#EF4444', '#EC4899'];

export function AdminAnalytics() {
  const [stats, setStats] = useState({
    totalPlays: 0,
    totalDownloads: 0,
    totalSearches: 0,
    totalFavorites: 0,
    playsByDay: [] as { date: string; count: number }[],
    topEpisodes: [] as { itemId: string; itemTitle: string; count: number }[],
    topSearches: [] as { query: string; count: number }[],
    eventTypeCounts: [] as { type: string; count: number }[]
  });
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadStats();
  }, [days]);

  async function loadStats() {
    setLoading(true);
    const data = await getAnalyticsStats(days);
    setStats(data);
    setLoading(false);
  }

  const statCards = [
    { label: 'Total Plays', value: stats.totalPlays, icon: Play, color: 'bg-primary', change: `Last ${days} days` },
    { label: 'Downloads', value: stats.totalDownloads, icon: Download, color: 'bg-emerald-500', change: `Last ${days} days` },
    { label: 'Searches', value: stats.totalSearches, icon: Search, color: 'bg-violet-500', change: `Last ${days} days` },
    { label: 'Favorites Added', value: stats.totalFavorites, icon: Heart, color: 'bg-rose-500', change: `Last ${days} days` }
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
          <p className="text-slate-400 mt-1">Track user engagement and content performance</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:border-primary/50"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-slate-700 mb-4" />
              <div className="h-8 w-16 bg-slate-700 rounded mb-2" />
              <div className="h-4 w-24 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {statCards.map((stat) => (
              <motion.div
                key={stat.label}
                variants={item}
                className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.color)}>
                  <stat.icon size={20} className="text-white" />
                </div>
                <p className="text-3xl font-bold text-slate-100">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
                <p className="text-xs text-slate-500 mt-2">{stat.change}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              variants={item}
              initial="hidden"
              animate="show"
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-slate-100">Plays Over Time</h2>
              </div>
              {stats.playsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.playsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value: string) => formatDate(value)}
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#00D9FF" 
                      strokeWidth={2}
                      dot={{ fill: '#00D9FF', strokeWidth: 2 }}
                      name="Plays"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  No play data available
                </div>
              )}
            </motion.div>

            <motion.div
              variants={item}
              initial="hidden"
              animate="show"
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
            >
              <div className="flex items-center gap-2 mb-6">
                <Activity size={20} className="text-violet-400" />
                <h2 className="text-lg font-semibold text-slate-100">Event Distribution</h2>
              </div>
              {stats.eventTypeCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.eventTypeCounts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                    >
                      {stats.eventTypeCounts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  No event data available
                </div>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              variants={item}
              initial="hidden"
              animate="show"
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
            >
              <div className="flex items-center gap-2 mb-6">
                <Play size={20} className="text-emerald-400" />
                <h2 className="text-lg font-semibold text-slate-100">Top Episodes</h2>
              </div>
              {stats.topEpisodes.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.topEpisodes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="itemTitle" 
                      stroke="#64748b" 
                      fontSize={12}
                      width={150}
                      tickFormatter={(value) => value.length > 20 ? `${value.slice(0, 20)}...` : value}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="#22C55E" radius={[0, 4, 4, 0]} name="Plays" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  No episode data available
                </div>
              )}
            </motion.div>

            <motion.div
              variants={item}
              initial="hidden"
              animate="show"
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
            >
              <div className="flex items-center gap-2 mb-6">
                <Search size={20} className="text-amber-400" />
                <h2 className="text-lg font-semibold text-slate-100">Popular Searches</h2>
              </div>
              {stats.topSearches.length > 0 ? (
                <div className="space-y-3">
                  {stats.topSearches.map((search, index) => (
                    <div 
                      key={search.query}
                      className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-xl"
                    >
                      <span className="text-lg font-bold text-slate-500 w-6">{index + 1}</span>
                      <span className="flex-1 text-slate-200 truncate">{search.query}</span>
                      <span className="text-sm text-slate-400">{search.count} searches</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  No search data available
                </div>
              )}
            </motion.div>
          </div>

          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-100">Analytics Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <p className="text-slate-200 font-medium mb-1">Data Collection</p>
                <p>Analytics are collected from user interactions including plays, downloads, searches, and favorites.</p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <p className="text-slate-200 font-medium mb-1">Privacy</p>
                <p>Session IDs are used to track unique visits without storing personal user data.</p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <p className="text-slate-200 font-medium mb-1">Retention</p>
                <p>Data is stored in Appwrite and can be managed or deleted from the analytics collection.</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}