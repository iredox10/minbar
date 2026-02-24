import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AudioProvider } from './context/AudioContext';
import { AdminProvider } from './context/AdminContext';
import { useAdmin } from './context/AdminContext';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';

// Lazy load all pages for code splitting
const Layout = lazy(() => import('./components/layout/Layout').then(m => ({ default: m.Layout })));
const Podcasts = lazy(() => import('./pages/Podcasts').then(m => ({ default: m.Podcasts })));
const Speakers = lazy(() => import('./pages/Speakers').then(m => ({ default: m.Speakers })));
const SpeakerDetail = lazy(() => import('./pages/SpeakerDetail').then(m => ({ default: m.SpeakerDetail })));
const SeriesDetail = lazy(() => import('./pages/SeriesDetail').then(m => ({ default: m.SeriesDetail })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const Favorites = lazy(() => import('./pages/Favorites').then(m => ({ default: m.Favorites })));
const Playlists = lazy(() => import('./pages/Playlists').then(m => ({ default: m.Playlists })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const Radio = lazy(() => import('./pages/Radio').then(m => ({ default: m.Radio })));
const Duas = lazy(() => import('./pages/Duas').then(m => ({ default: m.Duas })));
const Downloads = lazy(() => import('./pages/Downloads').then(m => ({ default: m.Downloads })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const EpisodeDetail = lazy(() => import('./pages/EpisodeDetail').then(m => ({ default: m.EpisodeDetail })));
const Series = lazy(() => import('./pages/Series').then(m => ({ default: m.Series })));
const LatestEpisodes = lazy(() => import('./pages/LatestEpisodes').then(m => ({ default: m.LatestEpisodes })));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminSpeakers = lazy(() => import('./pages/admin/AdminSpeakers').then(m => ({ default: m.AdminSpeakers })));
const AdminSpeakerForm = lazy(() => import('./pages/admin/AdminSpeakerForm').then(m => ({ default: m.AdminSpeakerForm })));
const AdminSeries = lazy(() => import('./pages/admin/AdminSeries').then(m => ({ default: m.AdminSeries })));
const AdminSeriesForm = lazy(() => import('./pages/admin/AdminSeriesForm').then(m => ({ default: m.AdminSeriesForm })));
const AdminEpisodes = lazy(() => import('./pages/admin/AdminEpisodes').then(m => ({ default: m.AdminEpisodes })));
const AdminEpisodeForm = lazy(() => import('./pages/admin/AdminEpisodeForm').then(m => ({ default: m.AdminEpisodeForm })));
const AdminDuas = lazy(() => import('./pages/admin/AdminDuas').then(m => ({ default: m.AdminDuas })));
const AdminDuaForm = lazy(() => import('./pages/admin/AdminDuaForm').then(m => ({ default: m.AdminDuaForm })));
const AdminRadio = lazy(() => import('./pages/admin/AdminRadio').then(m => ({ default: m.AdminRadio })));
const AdminRadioForm = lazy(() => import('./pages/admin/AdminRadioForm').then(m => ({ default: m.AdminRadioForm })));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminArchiveImport = lazy(() => import('./pages/admin/AdminArchiveImport').then(m => ({ default: m.AdminArchiveImport })));
const AdminYouTubeImport = lazy(() => import('./pages/admin/AdminYouTubeImport').then(m => ({ default: m.AdminYouTubeImport })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function AdminRoutes() {
  const { isAuthenticated, loading } = useAdmin();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="speakers" element={<AdminSpeakers />} />
          <Route path="speakers/new" element={<AdminSpeakerForm />} />
          <Route path="speakers/:id" element={<AdminSpeakerForm />} />
          <Route path="series" element={<AdminSeries />} />
          <Route path="series/new" element={<AdminSeriesForm />} />
          <Route path="series/:id" element={<AdminSeriesForm />} />
          <Route path="episodes" element={<AdminEpisodes />} />
          <Route path="episodes/new" element={<AdminEpisodeForm />} />
          <Route path="episodes/:id" element={<AdminEpisodeForm />} />
          <Route path="duas" element={<AdminDuas />} />
          <Route path="duas/new" element={<AdminDuaForm />} />
          <Route path="duas/:id" element={<AdminDuaForm />} />
          <Route path="radio" element={<AdminRadio />} />
          <Route path="radio/new" element={<AdminRadioForm />} />
          <Route path="radio/:id" element={<AdminRadioForm />} />
          <Route path="import" element={<AdminArchiveImport />} />
          <Route path="youtube" element={<AdminYouTubeImport />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AudioProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Podcasts />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/history" element={<History />} />
              <Route path="/podcasts/speakers" element={<Speakers />} />
              <Route path="/podcasts/series" element={<Series />} />
              <Route path="/podcasts/latest" element={<LatestEpisodes />} />
              <Route path="/podcasts/speaker/:slug" element={<SpeakerDetail />} />
              <Route path="/podcasts/series/:id" element={<SeriesDetail />} />
              <Route path="/podcasts/episode/:id" element={<EpisodeDetail />} />
              <Route path="/radio" element={<Radio />} />
              <Route path="/duas" element={<Duas />} />
              <Route path="/duas/:id" element={<Duas />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route
              path="/admin/*"
              element={
                <AdminProvider>
                  <AdminRoutes />
                </AdminProvider>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AudioProvider>
  );
}

export default App;