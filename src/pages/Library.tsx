import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  Radio,
  Clock,
  Heart,
  Download,
  ListMusic,
  History,
  ChevronRight,
  Library as LibraryIcon,
  Bookmark,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

interface LibrarySection {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  accent: string;       // Tailwind bg colour class for the icon well
  iconColor: string;    // Tailwind text colour class
}

const PRIMARY_SECTIONS: LibrarySection[] = [
  {
    label: 'Speakers',
    description: 'Browse all scholars & lecturers',
    path: '/podcasts/speakers',
    icon: Users,
    accent: 'bg-primary/15',
    iconColor: 'text-primary',
  },
  {
    label: 'Series',
    description: 'Full lecture series & courses',
    path: '/podcasts/series',
    icon: BookOpen,
    accent: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
  {
    label: 'Live Radio',
    description: 'Stream Islamic radio stations',
    path: '/radio',
    icon: Radio,
    accent: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  {
    label: 'Duas',
    description: 'Prophetic & Quranic supplications',
    path: '/duas',
    icon: BookOpen,
    accent: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
  },
  {
    label: 'Latest Episodes',
    description: 'Newly published lectures',
    path: '/podcasts/latest',
    icon: Clock,
    accent: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
  },
];

const PERSONAL_SECTIONS: LibrarySection[] = [
  {
    label: 'Favorites',
    description: 'Episodes & series you saved',
    path: '/favorites',
    icon: Heart,
    accent: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  {
    label: 'Downloads',
    description: 'Available offline',
    path: '/downloads',
    icon: Download,
    accent: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
  },
  {
    label: 'Playlists',
    description: 'Your custom queues',
    path: '/playlists',
    icon: ListMusic,
    accent: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
  },
  {
    label: 'History',
    description: 'Recently played',
    path: '/history',
    icon: History,
    accent: 'bg-slate-500/15',
    iconColor: 'text-slate-400',
  },
  {
    label: 'Bookmarks',
    description: 'Saved positions in episodes',
    path: '/bookmarks',
    icon: Bookmark,
    accent: 'bg-primary/15',
    iconColor: 'text-primary',
  },
];

function SectionRow({ section }: { section: LibrarySection }) {
  const Icon = section.icon;
  return (
    <motion.div variants={item} whileTap={{ scale: 0.98 }}>
      <Link
        to={section.path}
        className="flex items-center gap-4 p-4 glass-card rounded-2xl group hover:border-slate-600/60 transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${section.accent}`}>
          <Icon size={22} className={section.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 group-hover:text-primary transition-colors">
            {section.label}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
        </div>
        <ChevronRight size={18} className="text-slate-600 group-hover:text-primary transition-colors flex-shrink-0" />
      </Link>
    </motion.div>
  );
}

export function Library() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern opacity-30" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative px-4 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-1"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <LibraryIcon size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Library</h1>
              <p className="text-xs text-slate-500">All content, all in one place</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-8">
        {/* Explore */}
        <motion.section variants={container} initial="hidden" animate="show">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Explore</h2>
          </div>
          <div className="space-y-3">
            {PRIMARY_SECTIONS.map((s) => (
              <SectionRow key={s.path} section={s} />
            ))}
          </div>
        </motion.section>

        {/* My Library */}
        <motion.section variants={container} initial="hidden" animate="show">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-emerald-400 rounded-full" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">My Library</h2>
          </div>
          <div className="space-y-3">
            {PERSONAL_SECTIONS.map((s) => (
              <SectionRow key={s.path} section={s} />
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
