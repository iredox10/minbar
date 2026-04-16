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
import { SupportBanner } from '../components/SupportBanner';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../lib/i18n';

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
  labelKey: TranslationKey;
  descKey: TranslationKey;
  path: string;
  icon: React.ElementType;
  accent: string;
  iconColor: string;
}

const PRIMARY_SECTIONS: LibrarySection[] = [
  {
    labelKey: 'speakers',
    descKey: 'speakersDesc',
    path: '/podcasts/speakers',
    icon: Users,
    accent: 'bg-primary/15',
    iconColor: 'text-primary',
  },
  {
    labelKey: 'series',
    descKey: 'seriesDesc',
    path: '/podcasts/series',
    icon: BookOpen,
    accent: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
  {
    labelKey: 'liveRadio',
    descKey: 'liveRadioDesc',
    path: '/radio',
    icon: Radio,
    accent: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  {
    labelKey: 'duas',
    descKey: 'duasDesc',
    path: '/duas',
    icon: BookOpen,
    accent: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
  },
  {
    labelKey: 'latestEpisodes',
    descKey: 'latestEpisodesDesc',
    path: '/podcasts/latest',
    icon: Clock,
    accent: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
  },
];

const PERSONAL_SECTIONS: LibrarySection[] = [
  {
    labelKey: 'favorites',
    descKey: 'favoritesDesc',
    path: '/favorites',
    icon: Heart,
    accent: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  {
    labelKey: 'downloads',
    descKey: 'downloadsDesc',
    path: '/downloads',
    icon: Download,
    accent: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
  },
  {
    labelKey: 'playlists',
    descKey: 'playlistsDesc',
    path: '/playlists',
    icon: ListMusic,
    accent: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
  },
  {
    labelKey: 'history',
    descKey: 'historyDesc',
    path: '/history',
    icon: History,
    accent: 'bg-slate-500/15',
    iconColor: 'text-slate-400',
  },
  {
    labelKey: 'bookmarks',
    descKey: 'bookmarksDesc',
    path: '/bookmarks',
    icon: Bookmark,
    accent: 'bg-primary/15',
    iconColor: 'text-primary',
  },
];

function SectionRow({ section }: { section: LibrarySection }) {
  const { t } = useTranslation();
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
            {t(section.labelKey)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{t(section.descKey)}</p>
        </div>
        <ChevronRight size={18} className="text-slate-600 group-hover:text-primary transition-colors flex-shrink-0" />
      </Link>
    </motion.div>
  );
}

export function Library() {
  const { t } = useTranslation();
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
              <h1 className="text-2xl font-bold text-slate-100">{t('library')}</h1>
              <p className="text-xs text-slate-500">{t('allContent')}</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-8">
        {/* Explore */}
        <motion.section variants={container} initial="hidden" animate="show">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('explore')}</h2>
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
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('myLibrary')}</h2>
          </div>
          <div className="space-y-3">
            {PERSONAL_SECTIONS.map((s) => (
              <SectionRow key={s.path} section={s} />
            ))}
          </div>
        </motion.section>

        {/* Support Banner */}
        <div className="pt-4 -mx-4">
          <SupportBanner />
        </div>
      </div>
    </div>
  );
}
