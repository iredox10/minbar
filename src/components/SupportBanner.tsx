import { Link } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppSettings } from '../hooks/useAppSettings';

export function SupportBanner() {
  const { settings, loading } = useAppSettings();

  if (loading || !settings.isDonationsEnabled) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-6"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-primary/10 border border-emerald-500/20 p-5">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex flex-shrink-0 items-center justify-center text-emerald-400 mt-1">
            <Heart size={24} className="fill-emerald-400/20" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-slate-100 flex items-center gap-1.5 mb-1.5">
              Keep the App Running <Sparkles size={14} className="text-amber-400" />
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Arewa Central is free and ad-free. Support us to cover server costs and keep beneficial knowledge accessible to everyone.
            </p>
            
            <Link 
              to="/donate"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25"
            >
              Donate Now
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
