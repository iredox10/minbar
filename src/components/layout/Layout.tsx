import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MiniPlayer } from '../audio/MiniPlayer';
import { PWAInstallBanner } from './PWAInstallBanner';
import { Toaster } from 'sonner';

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <PWAInstallBanner />
      <main className="pb-36">
        <Outlet />
      </main>
      <MiniPlayer />
      <BottomNav />
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          }
        }}
      />
    </div>
  );
}