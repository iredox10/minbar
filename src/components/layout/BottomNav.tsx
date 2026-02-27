import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlayCircle, Library, Download, Settings, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/player', icon: PlayCircle, label: 'Player' },
  { path: '/library', icon: Library, label: 'Library' },
  { path: '/downloads', icon: Download, label: 'Downloads' },
  { path: '/settings', icon: Settings, label: 'Settings' }
];

const LIBRARY_PATHS = ['/library', '/podcasts', '/radio', '/favorites', '/playlists', '/history', '/duas'];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50" />
      
      <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map(({ path, icon: Icon, label }) => {
          let isActive = location.pathname === path;
          if (!isActive && path !== '/') {
            if (path === '/library') {
              isActive = LIBRARY_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
            } else {
              isActive = location.pathname.startsWith(path);
            }
          }
          
          return (
            <NavLink
              key={path}
              to={path}
              className="relative flex flex-col items-center justify-center gap-1 py-2 px-3"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                />
              )}
              
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "relative z-10 transition-colors",
                  isActive ? "text-primary" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Icon size={22} />
              </motion.div>
              
              <span className={cn(
                "relative z-10 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-slate-500"
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}