import Dexie, { type EntityTable } from 'dexie';
import type {
  DownloadedEpisode,
  Favorite,
  Playlist,
  PlaylistItem,
  PlaybackHistory,
  AppSettings,
  Bookmark
} from '../types';

export interface SavedPlaybackState {
  id?: number;
  deviceId: string;
  trackId: string;
  trackType: 'episode' | 'radio' | 'dua';
  trackTitle: string;
  trackAudioUrl: string;
  trackArtworkUrl?: string;
  trackSpeaker?: string;
  trackDuration: number;
  trackSeriesId?: string;
  trackEpisodeNumber?: number;
  position: number;
  playbackSpeed: number;
  updatedAt: Date;
  synced: boolean;
}

const db = new Dexie('MuslimCentralDB') as Dexie & {
  downloads: EntityTable<DownloadedEpisode, 'id'>;
  favorites: EntityTable<Favorite, 'id'>;
  playlists: EntityTable<Playlist, 'id'>;
  playlistItems: EntityTable<PlaylistItem, 'id'>;
  playbackHistory: EntityTable<PlaybackHistory, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
  playbackState: EntityTable<SavedPlaybackState, 'id'>;
  bookmarks: EntityTable<Bookmark, 'id'>;
};

db.version(2).stores({
  downloads: '++id, episodeId, seriesId, downloadedAt',
  favorites: '++id, [type+itemId], addedAt',
  playlists: '++id, createdAt',
  playlistItems: '++id, playlistId, episodeId, addedAt',
  playbackHistory: '++id, episodeId, playedAt',
  settings: '++id',
  playbackState: '++id, deviceId, updatedAt, synced'
});

db.version(3).stores({
  downloads: '++id, episodeId, seriesId, downloadedAt',
  favorites: '++id, [type+itemId], addedAt',
  playlists: '++id, createdAt',
  playlistItems: '++id, playlistId, episodeId, addedAt',
  playbackHistory: '++id, episodeId, playedAt',
  settings: '++id',
  playbackState: '++id, deviceId, updatedAt, synced',
  bookmarks: '++id, episodeId, createdAt'
});

export { db };

export async function getDownload(episodeId: string): Promise<DownloadedEpisode | undefined> {
  return db.downloads.where('episodeId').equals(episodeId).first();
}

export async function getAllDownloads(): Promise<DownloadedEpisode[]> {
  return db.downloads.orderBy('downloadedAt').reverse().toArray();
}

export async function saveDownload(episode: Omit<DownloadedEpisode, 'id'>): Promise<number> {
  const existing = await getDownload(episode.episodeId);
  if (existing) {
    return existing.id!;
  }
  return db.downloads.add(episode as DownloadedEpisode) as Promise<number>;
}

export async function deleteDownload(episodeId: string): Promise<void> {
  const download = await getDownload(episodeId);
  if (download?.localBlobUrl) {
    URL.revokeObjectURL(download.localBlobUrl);
  }
  await db.downloads.where('episodeId').equals(episodeId).delete();
}

export async function isDownloaded(episodeId: string): Promise<boolean> {
  const download = await getDownload(episodeId);
  return !!download;
}

export async function addFavorite(favorite: Omit<Favorite, 'id'>): Promise<number> {
  const existing = await db.favorites
    .where('[type+itemId]')
    .equals([favorite.type, favorite.itemId])
    .first();
  if (existing) return existing.id!;
  return db.favorites.add(favorite as Favorite) as Promise<number>;
}

export async function removeFavorite(type: 'episode' | 'series' | 'dua', itemId: string): Promise<void> {
  await db.favorites.where('[type+itemId]').equals([type, itemId]).delete();
}

export async function isFavorite(type: 'episode' | 'series' | 'dua', itemId: string): Promise<boolean> {
  const fav = await db.favorites.where('[type+itemId]').equals([type, itemId]).first();
  return !!fav;
}

export async function getFavorites(type?: 'episode' | 'series' | 'dua'): Promise<Favorite[]> {
  if (type) {
    return db.favorites.where('type').equals(type).reverse().sortBy('addedAt');
  }
  return db.favorites.orderBy('addedAt').reverse().toArray();
}

export async function getPlaybackHistory(episodeId: string): Promise<PlaybackHistory | undefined> {
  return db.playbackHistory.where('episodeId').equals(episodeId).first();
}

export async function updatePlaybackProgress(
  episodeId: string,
  position: number,
  duration: number,
  completed: boolean = false,
  meta?: { title?: string; artworkUrl?: string; audioUrl?: string; speaker?: string }
): Promise<void> {
  const existing = await getPlaybackHistory(episodeId);
  const data: Omit<PlaybackHistory, 'id'> = {
    episodeId,
    position,
    duration,
    playedAt: new Date(),
    completed,
    ...(meta ?? {})
  };
  
  if (existing) {
    await db.playbackHistory.update(existing.id!, data);
  } else {
    await db.playbackHistory.add(data as PlaybackHistory);
  }
}

export async function getRecentHistory(limit: number = 20): Promise<PlaybackHistory[]> {
  return db.playbackHistory.orderBy('playedAt').reverse().limit(limit).toArray();
}

export async function getInProgressHistory(limit: number = 10): Promise<PlaybackHistory[]> {
  const all = await db.playbackHistory.orderBy('playedAt').reverse().toArray();
  return all
    .filter(h => {
      if (!h.duration || h.duration === 0) return false;
      const ratio = h.position / h.duration;
      return ratio >= 0.05 && ratio <= 0.95;
    })
    .slice(0, limit);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  return db.settings.toCollection().first();
}

export async function getOrCreateSettings(): Promise<AppSettings> {
  const settings = await db.settings.toCollection().first();
  if (settings) return settings;
  
  const defaultSettings: Omit<AppSettings, 'id'> = {
    theme: 'dark',
    playbackSpeed: 1,
    downloadWifiOnly: true,
    autoDownload: false
  };
  const id = await db.settings.add(defaultSettings as AppSettings) as number;
  return { id, ...defaultSettings };
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const settings = await getSettings();
  if (settings?.id) {
    await db.settings.update(settings.id, updates);
  } else {
    await db.settings.add({ 
      theme: 'dark',
      playbackSpeed: 1,
      downloadWifiOnly: true,
      autoDownload: false,
      ...updates 
    } as AppSettings);
  }
}

export async function updatePlaylist(id: number, updates: { name?: string; description?: string }): Promise<void> {
  await db.playlists.update(id, { ...updates, updatedAt: new Date() });
}

export async function createPlaylist(name: string, description?: string): Promise<number> {
  const now = new Date();
  return db.playlists.add({
    name,
    description,
    createdAt: now,
    updatedAt: now
  } as Playlist) as Promise<number>;
}

export async function addToPlaylist(playlistId: number, episodeId: string): Promise<void> {
  const existing = await db.playlistItems
    .where('[playlistId+episodeId]')
    .equals([playlistId, episodeId])
    .first();
  
  if (!existing) {
    await db.playlistItems.add({
      playlistId,
      episodeId,
      addedAt: new Date()
    } as PlaylistItem);
  }
}

export async function getPlaylists(): Promise<Playlist[]> {
  return db.playlists.orderBy('createdAt').reverse().toArray();
}

export async function getPlaylistItems(playlistId: number): Promise<PlaylistItem[]> {
  return db.playlistItems.where('playlistId').equals(playlistId).toArray();
}

export async function deletePlaylist(playlistId: number): Promise<void> {
  await db.playlistItems.where('playlistId').equals(playlistId).delete();
  await db.playlists.delete(playlistId);
}

export async function removeFromPlaylist(playlistId: number, episodeId: string): Promise<void> {
  await db.playlistItems
    .where('[playlistId+episodeId]')
    .equals([playlistId, episodeId])
    .delete();
}

export async function saveLocalPlaybackState(state: Omit<SavedPlaybackState, 'id'>): Promise<void> {
  const existing = await db.playbackState.where('deviceId').equals(state.deviceId).first();
  if (existing) {
    await db.playbackState.update(existing.id!, state);
  } else {
    await db.playbackState.add(state as SavedPlaybackState);
  }
}

export async function getLocalPlaybackState(deviceId: string): Promise<SavedPlaybackState | undefined> {
  return db.playbackState.where('deviceId').equals(deviceId).first();
}

export async function clearLocalPlaybackState(deviceId: string): Promise<void> {
  await db.playbackState.where('deviceId').equals(deviceId).delete();
}

export async function getUnsyncedPlaybackState(): Promise<SavedPlaybackState | undefined> {
  return db.playbackState.where('synced').equals(0).first();
}

// ─── Bookmark helpers ─────────────────────────────────────────────────────────

export async function addBookmark(bookmark: Omit<Bookmark, 'id'>): Promise<number> {
  return db.bookmarks.add(bookmark as Bookmark) as Promise<number>;
}

export async function getBookmarks(episodeId?: string): Promise<Bookmark[]> {
  if (episodeId) {
    return db.bookmarks.where('episodeId').equals(episodeId).sortBy('position');
  }
  return db.bookmarks.orderBy('createdAt').reverse().toArray();
}

export async function deleteBookmark(id: number): Promise<void> {
  await db.bookmarks.delete(id);
}