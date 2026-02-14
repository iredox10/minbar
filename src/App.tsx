import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Podcasts } from './pages/Podcasts';
import { Radio } from './pages/Radio';
import { Duas } from './pages/Duas';
import { Downloads } from './pages/Downloads';
import { Settings } from './pages/Settings';
import { EpisodeDetail } from './pages/EpisodeDetail';
import { AudioProvider } from './context/AudioContext';

function App() {
  return (
    <AudioProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Podcasts />} />
            <Route path="/podcasts/*" element={<Podcasts />} />
            <Route path="/podcasts/episode/:id" element={<EpisodeDetail />} />
            <Route path="/radio" element={<Radio />} />
            <Route path="/duas" element={<Duas />} />
            <Route path="/duas/:id" element={<Duas />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AudioProvider>
  );
}

export default App;