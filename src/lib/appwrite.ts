import { Client, Databases, Storage, Query } from 'appwrite';
import type { Speaker, Series, Episode, Dua, RadioStation } from '../types';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

export const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(appwriteClient);
export const storage = new Storage(appwriteClient);

export const DATABASE_ID = 'muslim-central';
export const SPEAKERS_COLLECTION = 'speakers';
export const SERIES_COLLECTION = 'series';
export const EPISODES_COLLECTION = 'episodes';
export const DUAS_COLLECTION = 'duas';
export const RADIO_COLLECTION = 'radio_stations';
export const AUDIO_BUCKET_ID = 'audio';

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

export async function getEpisodesBySeries(seriesId: string): Promise<Episode[]> {
  if (!isAppwriteConfigured()) return [];
  const response = await databases.listDocuments(
    DATABASE_ID,
    EPISODES_COLLECTION,
    [Query.equal('seriesId', seriesId), Query.orderAsc('episodeNumber')]
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
  return storage.getFileView(AUDIO_BUCKET_ID, fileId);
}

export function getImageUrl(fileId: string, bucketId: string = 'images'): string {
  if (!isAppwriteConfigured()) return '';
  return storage.getFileView(bucketId, fileId);
}