interface MetaTags {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

const DEFAULT_TITLE = 'Arewa Central - Free Islamic Podcasts & Duas';
const DEFAULT_DESCRIPTION = 'Discover knowledge, inspiration & guidance. Free Islamic podcasts and duas — no ads.';
const DEFAULT_IMAGE = '/og-image.png';
const BASE_URL = window.location.origin;

export function updateMetaTags(meta: MetaTags): void {
  const title = meta.title || DEFAULT_TITLE;
  const description = meta.description || DEFAULT_DESCRIPTION;
  const image = meta.image || DEFAULT_IMAGE;
  const url = meta.url || window.location.href;
  const type = meta.type || 'article';

  document.title = title;

  updateOrCreateMeta('meta[name="description"]', 'content', description);
  
  updateOrCreateMeta('meta[property="og:type"]', 'content', type);
  updateOrCreateMeta('meta[property="og:url"]', 'content', url);
  updateOrCreateMeta('meta[property="og:title"]', 'content', title);
  updateOrCreateMeta('meta[property="og:description"]', 'content', description);
  updateOrCreateMeta('meta[property="og:image"]', 'content', image);
  updateOrCreateMeta('meta[property="og:site_name"]', 'content', 'Arewa Central');
  
  updateOrCreateMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
  updateOrCreateMeta('meta[name="twitter:url"]', 'content', url);
  updateOrCreateMeta('meta[name="twitter:title"]', 'content', title);
  updateOrCreateMeta('meta[name="twitter:description"]', 'content', description);
  updateOrCreateMeta('meta[name="twitter:image"]', 'content', image);
}

function updateOrCreateMeta(selector: string, attr: string, value: string): void {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    const nameAttr = selector.includes('property=') ? 'property' : 'name';
    const nameValue = selector.match(/name="([^"]+)"/)?.[1] || selector.match(/property="([^"]+)"/)?.[1] || '';
    el.setAttribute(nameAttr, nameValue);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function resetMetaTags(): void {
  updateMetaTags({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
    url: BASE_URL,
    type: 'website'
  });
}

export function getEpisodeMeta(episode: { title: string; description?: string; artworkUrl?: string; speaker?: string; $id: string }): MetaTags {
  return {
    title: `${episode.title}${episode.speaker ? ` | ${episode.speaker}` : ''} - Arewa Central`,
    description: episode.description || `Listen to "${episode.title}" on Arewa Central — Free Islamic Podcasts & Duas`,
    image: episode.artworkUrl || DEFAULT_IMAGE,
    url: `${BASE_URL}/podcasts/episode/${episode.$id}`,
    type: 'article'
  };
}

export function getSeriesMeta(series: { title: string; description?: string; artworkUrl?: string; episodeCount?: number; $id: string }): MetaTags {
  return {
    title: `${series.title} - Arewa Central`,
    description: series.description || `${series.episodeCount || ''} episodes in "${series.title}" on Arewa Central`,
    image: series.artworkUrl || DEFAULT_IMAGE,
    url: `${BASE_URL}/podcasts/series/${series.$id}`,
    type: 'article'
  };
}

export function getSpeakerMeta(speaker: { name: string; bio?: string; imageUrl?: string; slug: string }): MetaTags {
  return {
    title: `${speaker.name} - Arewa Central`,
    description: speaker.bio || `Listen to lectures by ${speaker.name} on Arewa Central`,
    image: speaker.imageUrl || DEFAULT_IMAGE,
    url: `${BASE_URL}/podcasts/speaker/${speaker.slug}`,
    type: 'profile'
  };
}
