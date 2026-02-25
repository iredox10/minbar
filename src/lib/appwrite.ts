import { Client, Databases, Storage, Query } from 'appwrite';
import type { Speaker, Series, Episode, Dua, RadioStation } from '../types';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'muslim-central';
const IMAGES_BUCKET = import.meta.env.VITE_APPWRITE_IMAGES_BUCKET || 'images';
const AUDIO_BUCKET = import.meta.env.VITE_APPWRITE_AUDIO_BUCKET || 'audio';

export const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(appwriteClient);
export const storage = new Storage(appwriteClient);

export { DATABASE_ID, IMAGES_BUCKET, AUDIO_BUCKET };

export const SPEAKERS_COLLECTION = 'speakers';
export const SERIES_COLLECTION = 'series';
export const EPISODES_COLLECTION = 'episodes';
export const DUAS_COLLECTION = 'duas';
export const RADIO_COLLECTION = 'radio_stations';
export const USER_PLAYBACK_COLLECTION = 'user_playback';

export function isAppwriteConfigured(): boolean {
  return !!APPWRITE_PROJECT_ID;
}

export async function getFeaturedSpeakers(limit: number = 10): Promise<Speaker[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    SPEAKERS_COLLECTION,
    [Query.equal('featured', true), Query.limit(limit)]
  );
  return response.documents as unknown as Speaker[];
}

export async function getAllSpeakers(): Promise<Speaker[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    SPEAKERS_COLLECTION,
    [Query.limit(100)]
  );
  return response.documents as unknown as Speaker[];
}

export async function getSpeakerBySlug(slug: string): Promise<Speaker | null> {
  if (!isAppwriteConfigured()) return null;
  const response = await databases.listDocuments(
    DATABASE_ID,
    SPEAKERS_COLLECTION,
    [Query.equal('slug', slug), Query.limit(1)]
  );
  return (response.documents[0] as unknown as Speaker) || null;
}

export async function getSeriesBySpeaker(speakerId: string): Promise<Series[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    SERIES_COLLECTION,
    [Query.equal('speakerId', speakerId), Query.limit(50)]
  );
  return response.documents as unknown as Series[];
}

export async function getSeriesById(seriesId: string): Promise<Series | null> {
  if (!isAppwriteConfigured()) return null;
  try {
    return await databases.getDocument(DATABASE_ID, SERIES_COLLECTION, seriesId) as unknown as Series;
  } catch {
    return null;
  }
}

export async function getLatestEpisodes(limit: number = 20): Promise<Episode[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    EPISODES_COLLECTION,
    [Query.orderDesc('publishedAt'), Query.limit(limit)]
  );
  return response.documents as unknown as Episode[];
}

export async function getFeaturedSeries(limit: number = 10): Promise<Series[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    SERIES_COLLECTION,
    [Query.limit(limit)]
  );
  return response.documents as unknown as Series[];
}

export async function getAllSeries(): Promise<Series[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    SERIES_COLLECTION,
    [Query.limit(200)]
  );
  return response.documents as unknown as Series[];
}

export async function getEpisodesBySeries(seriesId: string): Promise<Episode[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    EPISODES_COLLECTION,
    [Query.equal('seriesId', seriesId), Query.orderAsc('episodeNumber')]
  );
  return response.documents as unknown as Episode[];
}

export async function getStandaloneEpisodesBySpeaker(speakerId: string): Promise<Episode[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    EPISODES_COLLECTION,
    [Query.equal('speakerId', speakerId), Query.equal('isStandalone', true), Query.orderDesc('publishedAt')]
  );
  return response.documents as unknown as Episode[];
}

export async function getEpisodeById(episodeId: string): Promise<Episode | null> {
  if (!isAppwriteConfigured()) return null;
  try {
    return await databases.getDocument(DATABASE_ID, EPISODES_COLLECTION, episodeId) as unknown as Episode;
  } catch {
    return null;
  }
}

export async function searchEpisodes(query: string): Promise<Episode[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    EPISODES_COLLECTION,
    [Query.search('title', query), Query.limit(20)]
  );
  return response.documents as unknown as Episode[];
}

export async function getDuasByCategory(category: string): Promise<Dua[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    DUAS_COLLECTION,
    [Query.equal('category', category), Query.orderAsc('sortOrder')]
  );
  return response.documents as unknown as Dua[];
}

export async function getAllDuas(): Promise<Dua[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    DUAS_COLLECTION,
    [Query.limit(500)]
  );
  return response.documents as unknown as Dua[];
}

export async function getDuaById(duaId: string): Promise<Dua | null> {
  if (!isAppwriteConfigured()) return null;
  try {
    return await databases.getDocument(DATABASE_ID, DUAS_COLLECTION, duaId) as unknown as Dua;
  } catch {
    return null;
  }
}

export async function searchDuas(query: string): Promise<Dua[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    DUAS_COLLECTION,
    [Query.search('title', query), Query.limit(50)]
  );
  return response.documents as unknown as Dua[];
}

export async function getRadioStations(): Promise<RadioStation[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    RADIO_COLLECTION,
    [Query.limit(20)]
  );
  return response.documents as unknown as RadioStation[];
}

export async function getAudioUrl(fileId: string): Promise<string> {
  if (!isAppwriteConfigured()) return '';
  return storage.getFileView(AUDIO_BUCKET, fileId);
}

export function getImageUrl(fileId: string, bucketId: string = IMAGES_BUCKET): string {
  if (!isAppwriteConfigured()) return '';
  return storage.getFileView(bucketId, fileId);
}

interface SavedPlaybackState {
  $id: string;
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
  updatedAt: string;
}

function getDeviceId(): string {
  let deviceId = localStorage.getItem('mc_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('mc_device_id', deviceId);
  }
  return deviceId;
}

export async function savePlaybackState(track: {
  id: string;
  title: string;
  audioUrl: string;
  artworkUrl?: string;
  speaker?: string;
  duration: number;
  type: 'episode' | 'radio' | 'dua';
  seriesId?: string;
  episodeNumber?: number;
}, position: number, playbackSpeed: number): Promise<void> {
  if (!isAppwriteConfigured()) return;
  
  const deviceId = getDeviceId();
  
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      USER_PLAYBACK_COLLECTION,
      [Query.equal('deviceId', deviceId), Query.limit(1)]
    );
    
    const data = {
      deviceId,
      trackId: track.id,
      trackType: track.type,
      trackTitle: track.title,
      trackAudioUrl: track.audioUrl,
      trackArtworkUrl: track.artworkUrl || '',
      trackSpeaker: track.speaker || '',
      trackDuration: Math.floor(track.duration),
      trackSeriesId: track.seriesId || '',
      trackEpisodeNumber: track.episodeNumber || 0,
      position: Math.floor(position),
      playbackSpeed,
      updatedAt: new Date().toISOString(),
    };
    
    if (existing.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        USER_PLAYBACK_COLLECTION,
        existing.documents[0].$id,
        data
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        USER_PLAYBACK_COLLECTION,
        'unique()',
        data
      );
    }
  } catch (error) {
    console.error('Failed to save playback state:', error);
  }
}

export async function loadPlaybackState(): Promise<{
  track: {
    id: string;
    title: string;
    audioUrl: string;
    artworkUrl?: string;
    speaker?: string;
    duration: number;
    type: 'episode' | 'radio' | 'dua';
    seriesId?: string;
    episodeNumber?: number;
  } | null;
  position: number;
  playbackSpeed: number;
} | null> {
  if (!isAppwriteConfigured()) return null;
  
  const deviceId = getDeviceId();
  
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USER_PLAYBACK_COLLECTION,
      [Query.equal('deviceId', deviceId), Query.limit(1)]
    );
    
    if (response.documents.length === 0) return null;
    
    const doc = response.documents[0] as unknown as SavedPlaybackState;
    
    return {
      track: {
        id: doc.trackId,
        title: doc.trackTitle,
        audioUrl: doc.trackAudioUrl,
        artworkUrl: doc.trackArtworkUrl || undefined,
        speaker: doc.trackSpeaker || undefined,
        duration: doc.trackDuration,
        type: doc.trackType as 'episode' | 'radio' | 'dua',
        seriesId: doc.trackSeriesId || undefined,
        episodeNumber: doc.trackEpisodeNumber || undefined,
      },
      position: doc.position,
      playbackSpeed: doc.playbackSpeed,
    };
  } catch (error) {
    console.error('Failed to load playback state:', error);
    return null;
  }
}

export async function clearPlaybackState(): Promise<void> {
  if (!isAppwriteConfigured()) return;
  
  const deviceId = getDeviceId();
  
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USER_PLAYBACK_COLLECTION,
      [Query.equal('deviceId', deviceId), Query.limit(1)]
    );
    
    if (response.documents.length > 0) {
      await databases.deleteDocument(
        DATABASE_ID,
        USER_PLAYBACK_COLLECTION,
        response.documents[0].$id
      );
    }
  } catch (error) {
    console.error('Failed to clear playback state:', error);
  }
}