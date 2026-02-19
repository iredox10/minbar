import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Podcasts } from './pages/Podcasts';
import { Speakers } from './pages/Speakers';
import { SpeakerDetail } from './pages/SpeakerDetail';
import { SeriesDetail } from './pages/SeriesDetail';
import { SearchPage } from './pages/SearchPage';
import { Favorites } from './pages/Favorites';
import { Playlists } from './pages/Playlists';
import { History } from './pages/History';
import { Radio } from './pages/Radio';
import { Duas } from './pages/Duas';
import { Downloads } from './pages/Downloads';
import { Settings } from './pages/Settings';
import { EpisodeDetail } from './pages/EpisodeDetail';
import { AudioProvider } from './context/AudioContext';
import { AdminProvider } from './context/AdminContext';
import {
  AdminLogin,
  AdminLayout,
  AdminDashboard,
  AdminSpeakers,
  AdminSpeakerForm,
  AdminSeries,
  AdminSeriesForm,
  AdminEpisodes,
  AdminEpisodeForm,
  AdminDuas,
  AdminDuaForm,
  AdminRadio,
  AdminRadioForm
} from './pages/admin';
import { useAdmin } from './context/AdminContext';

function AdminRoutes() {
  const { isAuthenticated, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
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
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AudioProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Podcasts />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/history" element={<History />} />
            <Route path="/podcasts/speakers" element={<Speakers />} />
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
      </BrowserRouter>
    </AudioProvider>
  );
}

export default App;