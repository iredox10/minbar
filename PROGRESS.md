# Muslim Central PWA - Progress Tracker

## Goal

Build a complete **Muslim Central PWA** (Progressive Web App) - an Islamic audio content platform with podcasts, radio stations, duas (supplications), standalone audio, and an admin panel for content management. The app connects to Appwrite as a backend for database, storage, and authentication.

## Requirements

- Production-ready PWA with no ads, free access
- All features should work offline where possible
- Admin panel should allow full CRUD operations for all content types
- Use Appwrite for backend (database, storage, auth)
- Implement code splitting for better performance
- Allow importing audio content from Internet Archive directly without manual downloads

## Technical Setup

- **Appwrite Database**: `muslim-central` with collections: `speakers`, `series`, `episodes`, `duas`, `radio_stations`, `analytics`
- **Storage Buckets**: `images` and `audio` buckets configured with allowed file extensions
- **CORS**: Archive.org API requires CORS proxies - implemented multiple fallback proxies in `src/lib/archive.ts`

## Completed Features

### Core Pages
- [x] Home/Explore page with Featured Speakers, Series, Episodes
- [x] Speaker listing page (`/podcasts/speakers`)
- [x] Speaker detail page (`/podcasts/speaker/:slug`)
- [x] Series listing page (`/podcasts/series`)
- [x] Series detail page (`/podcasts/series/:id`)
- [x] Latest Episodes page (`/podcasts/latest`)
- [x] Episode detail page (`/podcasts/episode/:id`)
- [x] Global search functionality
- [x] Favorites page
- [x] Playlists page
- [x] History page
- [x] Downloads page - downloads to device + in-app offline playback
- [x] Radio streaming page
- [x] Duas page
- [x] Settings page with theme, playback speed, download preferences

### Audio Player
- [x] Global audio player with play, pause, seek
- [x] Playback speed control
- [x] Sleep timer
- [x] Format detection for Appwrite storage URLs
- [x] Fixed Howler.js format recognition issues

### Admin Panel
- [x] Admin authentication
- [x] Dashboard with analytics overview
- [x] CRUD for Speakers
- [x] CRUD for Series
- [x] CRUD for Episodes (with standalone support)
- [x] CRUD for Duas
- [x] CRUD for Radio Stations
- [x] Analytics page

### Special Features
- [x] Code splitting with React.lazy
- [x] Standalone audio - episodes can belong to a speaker without a series
- [x] Auto-duration calculation - audio duration auto-calculated on upload
- [x] Archive.org Import Tool (`/admin/import`)
  - Fetch by identifier or paste JSON manually
  - Select/deselect individual audio files
  - Edit series info before import
  - Select existing speaker or create new speaker
  - Upload custom cover image

### Bug Fixes
- [x] Dexie `useLiveQuery` caused read-only transaction error - fixed by separating `getSettings()` (read-only) from `getOrCreateSettings()` (writes)
- [x] Audio format recognition issues with Howler.js - fixed by explicitly setting format and handling Appwrite storage URLs

## Relevant Files

```
src/
├── App.tsx                    # Main app with React.lazy code splitting and routes
├── pages/
│   ├── Podcasts.tsx           # Homepage with "View all" links
│   ├── Speakers.tsx           # All speakers listing
│   ├── SpeakerDetail.tsx      # Speaker detail with series/episodes
│   ├── Series.tsx             # All series listing
│   ├── SeriesDetail.tsx       # Series detail with episodes
│   ├── LatestEpisodes.tsx     # All episodes listing
│   ├── EpisodeDetail.tsx      # Episode detail with player
│   ├── SearchPage.tsx         # Global search
│   ├── Favorites.tsx          # User favorites
│   ├── Playlists.tsx          # User playlists
│   ├── History.tsx            # Playback history
│   ├── Downloads.tsx          # Offline downloads
│   ├── Radio.tsx              # Radio streaming
│   ├── Duas.tsx               # Duas/supplications
│   ├── Settings.tsx           # App settings
│   └── admin/
│       ├── AdminLayout.tsx    # Admin layout wrapper
│       ├── AdminLogin.tsx     # Admin authentication
│       ├── AdminDashboard.tsx # Admin dashboard
│       ├── AdminSpeakers.tsx  # Speakers CRUD
│       ├── AdminSeries.tsx    # Series CRUD
│       ├── AdminEpisodes.tsx  # Episodes CRUD
│       ├── AdminDuas.tsx      # Duas CRUD
│       ├── AdminRadio.tsx     # Radio CRUD
│       ├── AdminAnalytics.tsx # Analytics view
│       └── AdminArchiveImport.tsx # Archive.org import tool
├── lib/
│   ├── appwrite.ts            # Appwrite client & queries
│   ├── admin.ts               # Admin API functions
│   ├── archive.ts             # Archive.org API service
│   ├── audio.ts               # AudioManager with Howler.js
│   ├── db.ts                  # IndexedDB for offline storage
│   └── utils.ts               # Utility functions
├── context/
│   ├── AudioContext.tsx       # Global audio state
│   └── AdminContext.tsx       # Admin auth state
└── types/
    └── index.ts               # TypeScript types

```

## Next Steps

- [ ] Test all "View all" links on homepage work correctly
- [ ] Add more robust error handling for Archive.org imports
- [ ] Implement playlist creation/management
- [ ] Add episode/series sharing functionality
- [ ] Implement search history
- [ ] Add accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Performance optimization for large content libraries

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```
