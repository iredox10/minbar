import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Play,
  Radio,
  Heart,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BarChart2,
  Upload,
  Youtube
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/admin/import', icon: Upload, label: 'Import from Archive' },
  { path: '/admin/youtube', icon: Youtube, label: 'YouTube Import' },
  { path: '/admin/speakers', icon: Users, label: 'Speakers' },
  { path: '/admin/series', icon: BookOpen, label: 'Series' },
  { path: '/admin/episodes', icon: Play, label: 'Episodes' },
  { path: '/admin/duas', icon: Heart, label: 'Duas' },
  { path: '/admin/radio', icon: Radio, label: 'Radio Stations' }
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        className="hidden lg:flex flex-col bg-slate-800/50 border-r border-slate-700/50 fixed left-0 top-0 bottom-0 z-40"
      >
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-lg">M</span>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  <p className="font-bold text-slate-100 whitespace-nowrap">Muslim Central</p>
                  <p className="text-xs text-slate-500">Admin Panel</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label, exact }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive
                    ? "bg-primary text-slate-900"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                )
              }
            >
              <Icon size={20} className="flex-shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl transition-all mb-2"
          >
            <ChevronRight size={18} className={cn("transition-transform", sidebarOpen && "rotate-180")} />
          </button>

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-700/30">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-medium text-sm">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </span>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm text-slate-200 truncate">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">M</span>
            </div>
            <span className="font-bold text-slate-100">Admin</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-slate-200"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 bottom-0 w-72 bg-slate-800 border-l border-slate-700/50 p-4 pt-20"
            >
              <div className="space-y-1">
                {navItems.map(({ path, icon: Icon, label, exact }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={exact}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                        isActive
                          ? "bg-primary text-slate-900"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                      )
                    }
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/30 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-medium">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 80 }}
        className={cn(
          "flex-1 min-w-0",
          "lg:ml-0"
        )}
        style={{ marginLeft: 0 }}
      >
        <div className="hidden lg:block" style={{ width: sidebarOpen ? 256 : 80 }} />
        <div className="lg:ml-auto p-4 lg:p-6 pt-20 lg:pt-6">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}