# Arewa Central — Feature Roadmap

Full list of recommended features with effort/impact ratings, implementation notes, and current status.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔨 | In progress |
| ⬜ | Not started |
| 🟡 | Partial / stubbed |

---

## High Impact / Medium Effort

### ✅ 1. Playlist "Play All" — finish the stub
**Files:** `src/pages/Playlists.tsx`, `src/context/AudioContext.tsx`

The "Play All" and "Edit" buttons in the playlist context menu are no-ops. Wire "Play All" to load
all playlist items into `setQueue()` then call `play()` on the first item. Wire "Edit" to a rename
sheet (name + description fields, save to IndexedDB via `updatePlaylist()`).

**Infrastructure already in place:** `setQueue`, `play`, `addToPlaylist`, `getPlaylistItems` (Dexie), `Playlist` type.

---

### ✅ 4. Continue Listening widget on Home
**Files:** `src/pages/Podcasts.tsx`, `src/lib/db.ts`

A horizontal scroll row on the home page showing in-progress episodes (> 5% but < 95% complete).
Uses the existing `playback_history` Dexie table which stores `lastPosition` and `duration` per episode.

**Steps:**
1. Add `getInProgressHistory(limit)` query to `db.ts` — filter by `lastPosition / duration` between 0.05 and 0.95.
2. Add a `ContinueListening` component to `Podcasts.tsx` — horizontal scroll row of cards showing artwork, title, and a progress bar.
3. Clicking a card calls `play(track, lastPosition)` to resume at the saved position.

---

### ✅ 5. Episode Detail page — audit & improve
**File:** `src/pages/EpisodeDetail.tsx`

Currently exists but may be minimal. Improvements:
- Show notes / description (if stored in Appwrite `episode.description`)
- Related episodes from the same series (query `getSeriesEpisodes`)
- "Next Episode" button that queues and plays the next in the series
- "Add to Playlist" inline button
- Share + Download actions matching the PlayerPage bottom sheets
- Progress bar showing how far through the episode the user is (from History)

---

### ✅ 7. Persist playback speed across sessions
**Files:** `src/context/AudioContext.tsx`, `src/lib/db.ts`

`playbackSpeed` resets to `1x` on every reload. Fix:
1. On speed change (`setPlaybackSpeed`), write to `AppSettings` in Dexie (`db.settings.put({ key: 'playbackSpeed', value: speed })`).
2. On AudioContext mount, read saved speed from Dexie and initialise state with it.

Roughly 10 lines of code. No UI changes needed.

---

### ✅ 8. Queue management UI — "Up Next" sheet
**Files:** `src/pages/PlayerPage.tsx`, `src/context/AudioContext.tsx`

`queue`, `currentIndex`, and `setQueue` already exist in AudioContext. Add an "Up Next" button to
the PlayerPage secondary controls row that opens a bottom sheet showing:
- Currently playing track (highlighted)
- All queued tracks below, each with artwork thumbnail + title + duration
- Tap any track to jump to it (`seek` to 0 + set `currentIndex`)
- Swipe-to-remove or an ✕ button per item to remove from queue
- Optional: drag handle for reordering (use Framer Motion's `Reorder` component)

**New action needed in AudioContext:** `removeFromQueue(index)`, `jumpToQueueIndex(index)`.

---

### ✅ 9. Bookmarks / timestamps
**Files:** `src/lib/db.ts`, `src/pages/PlayerPage.tsx`, `src/pages/Library.tsx`, new `src/pages/Bookmarks.tsx`

Let users drop a named bookmark at the current playback position.

**Schema addition to Dexie:**
```ts
interface Bookmark {
  id?: number;
  episodeId: string;
  episodeTitle: string;
  speakerName: string;
  artworkUrl?: string;
  audioUrl: string;
  position: number;       // seconds
  note?: string;
  createdAt: Date;
}
```

**Steps:**
1. Add `bookmarks` table to `db.ts` with `++id, episodeId, createdAt` indexes.
2. Add `addBookmark`, `getBookmarks`, `deleteBookmark` helpers to `db.ts`.
3. Add a bookmark button (🔖) to the PlayerPage action row — tapping opens a small inline input for an optional note, then saves.
4. New `Bookmarks.tsx` page listing all bookmarks grouped by episode, with a "Resume here" play button per entry.
5. Add "Bookmarks" link to the Library hub (`src/pages/Library.tsx`).
6. Add `/bookmarks` route to `App.tsx`.

---

## Engagement / Growth Features

### ⬜ 13. Share a Clip
**Files:** `src/lib/audioClip.ts` (exists — purpose TBD), `src/components/audio/ShareSheet.tsx`, `src/pages/PlayerPage.tsx`

Let users define a start + end timestamp and share a short audio excerpt or a timestamped deep link.

**Two tiers of implementation:**

**Tier 1 — Timestamped link (no audio processing):**
Generate a URL like `https://arewa.app/player?episodeId=xxx&t=142` that deep-links to the episode
at a specific second. The ShareSheet already exists — extend it with a "Share from here" option
that copies the current position into the URL.

**Tier 2 — Audio clip (requires Web Audio API + server function):**
Use `audioClip.ts` (audit first) to extract a 15–60 second WAV/MP3 segment client-side using
`AudioBuffer`, let the user preview it, then share via the Web Share API (`navigator.share({ files: [clip] })`).

Start with Tier 1 (30 min), decide if Tier 2 is worth building based on usage.

---

## Backlog (not currently prioritised)

| # | Feature | Notes |
|---|---------|-------|
| 2 | Persist Dua & Radio Favorites | IndexedDB `Favorite` table ready; Duas tab in Favorites page already stubbed |
| 3 | Offline-aware UI | Workbox caches audio; need `useOnlineStatus` hook + UI badges |
| 6 | Sleep timer from MediaSession | MediaSession fully wired; add `setSleepTimer` as a custom action |
| 10 | Trending searches in SearchBar | Read top queries from `analytics` Appwrite collection |
| 11 | Push Notifications | PWA service worker ready; needs `PushManager` + Appwrite Function |
| 12 | Streaks / Listening Goals | IndexedDB + home widget |
| 14 | Admin: completion rate stat | `play_complete` already tracked in analytics |
| 15 | Admin: bulk episode operations | Multi-select delete in AdminEpisodes |

---

## Implementation Order (current sprint)

```
1  → Playlist Play All (stub fix, ~30 min)
4  → Continue Listening widget (new feature, ~1 h)
5  → EpisodeDetail audit & improve (~1.5 h)
7  → Persist playback speed (~10 min)
8  → Up Next queue sheet (~2 h)
9  → Bookmarks (~2 h)
13 → Share a Clip — Tier 1 (~30 min)
```
