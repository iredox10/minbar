import { NavLink, useLocation } from 'react-router-dom';
import { Home, Radio, BookOpen, Download, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/radio', icon: Radio, label: 'Radio' },
  { path: '/duas', icon: BookOpen, label: 'Duas' },
  { path: '/downloads', icon: Download, label: 'Downloads' },
  { path: '/settings', icon: Settings, label: 'Settings' }
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));
          
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-4 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}