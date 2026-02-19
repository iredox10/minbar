import { Client, Account, Databases, Storage, Query, ID, Permission, Role } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

export const adminClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const adminAccount = new Account(adminClient);
export const adminDatabases = new Databases(adminClient);
export const adminStorage = new Storage(adminClient);

export { Query };

export const DATABASE_ID = 'muslim-central';
export const SPEAKERS_COLLECTION = 'speakers';
export const SERIES_COLLECTION = 'series';
export const EPISODES_COLLECTION = 'episodes';
export const DUAS_COLLECTION = 'duas';
export const RADIO_COLLECTION = 'radio_stations';
export const IMAGES_BUCKET = 'images';
export const AUDIO_BUCKET = 'audio';

export function isAdminConfigured(): boolean {
  return !!APPWRITE_PROJECT_ID;
}

export async function adminLogin(email: string, password: string): Promise<boolean> {
  try {
    await adminAccount.createEmailPasswordSession(email, password);
    return true;
  } catch (error) {
    console.error('Admin login failed:', error);
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await adminAccount.deleteSession('current');
  } catch (error) {
    console.error('Admin logout failed:', error);
  }
}

export async function getAdminUser(): Promise<{ $id: string; email: string; name: string } | null> {
  try {
    const user = await adminAccount.get();
    return user;
  } catch {
    return null;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    await adminAccount.get();
    return true;
  } catch {
    return false;
  }
}

export async function uploadImage(file: File): Promise<string> {
  const result = await adminStorage.createFile(IMAGES_BUCKET, ID.unique(), file);
  return adminStorage.getFileView(IMAGES_BUCKET, result.$id).toString();
}

export async function uploadAudio(file: File): Promise<string> {
  const result = await adminStorage.createFile(AUDIO_BUCKET, ID.unique(), file);
  return adminStorage.getFileView(AUDIO_BUCKET, result.$id).toString();
}

export async function deleteFile(bucketId: string, fileId: string): Promise<void> {
  await adminStorage.deleteFile(bucketId, fileId);
}

export async function getAdminStats(): Promise<{
  speakersCount: number;
  seriesCount: number;
  episodesCount: number;
  duasCount: number;
  radioCount: number;
}> {
  try {
    const [speakers, series, episodes, duas, radio] = await Promise.all([
      adminDatabases.listDocuments(DATABASE_ID, SPEAKERS_COLLECTION, [Query.limit(1)]),
      adminDatabases.listDocuments(DATABASE_ID, SERIES_COLLECTION, [Query.limit(1)]),
      adminDatabases.listDocuments(DATABASE_ID, EPISODES_COLLECTION, [Query.limit(1)]),
      adminDatabases.listDocuments(DATABASE_ID, DUAS_COLLECTION, [Query.limit(1)]),
      adminDatabases.listDocuments(DATABASE_ID, RADIO_COLLECTION, [Query.limit(1)])
    ]);

    return {
      speakersCount: speakers.total,
      seriesCount: series.total,
      episodesCount: episodes.total,
      duasCount: duas.total,
      radioCount: radio.total
    };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return {
      speakersCount: 0,
      seriesCount: 0,
      episodesCount: 0,
      duasCount: 0,
      radioCount: 0
    };
  }
}

export async function createSpeaker(data: Omit<import('../types').Speaker, '$id' | 'createdAt'>): Promise<string> {
  const result = await adminDatabases.createDocument(
    DATABASE_ID,
    SPEAKERS_COLLECTION,
    ID.unique(),
    { ...data, createdAt: new Date().toISOString() },
    [Permission.read(Role.any())]
  );
  return result.$id;
}

export async function updateSpeaker(id: string, data: Partial<import('../types').Speaker>): Promise<void> {
  await adminDatabases.updateDocument(DATABASE_ID, SPEAKERS_COLLECTION, id, data);
}

export async function deleteSpeaker(id: string): Promise<void> {
  await adminDatabases.deleteDocument(DATABASE_ID, SPEAKERS_COLLECTION, id);
}

export async function createSeries(data: Omit<import('../types').Series, '$id' | 'createdAt'>): Promise<string> {
  const result = await adminDatabases.createDocument(
    DATABASE_ID,
    SERIES_COLLECTION,
    ID.unique(),
    { ...data, createdAt: new Date().toISOString() },
    [Permission.read(Role.any())]
  );
  return result.$id;
}

export async function updateSeries(id: string, data: Partial<import('../types').Series>): Promise<void> {
  await adminDatabases.updateDocument(DATABASE_ID, SERIES_COLLECTION, id, data);
}

export async function deleteSeries(id: string): Promise<void> {
  await adminDatabases.deleteDocument(DATABASE_ID, SERIES_COLLECTION, id);
}

export async function createEpisode(data: Omit<import('../types').Episode, '$id'>): Promise<string> {
  const result = await adminDatabases.createDocument(
    DATABASE_ID,
    EPISODES_COLLECTION,
    ID.unique(),
    data,
    [Permission.read(Role.any())]
  );
  return result.$id;
}

export async function updateEpisode(id: string, data: Partial<import('../types').Episode>): Promise<void> {
  await adminDatabases.updateDocument(DATABASE_ID, EPISODES_COLLECTION, id, data);
}

export async function deleteEpisode(id: string): Promise<void> {
  await adminDatabases.deleteDocument(DATABASE_ID, EPISODES_COLLECTION, id);
}

export async function createDua(data: Omit<import('../types').Dua, '$id'>): Promise<string> {
  const result = await adminDatabases.createDocument(
    DATABASE_ID,
    DUAS_COLLECTION,
    ID.unique(),
    data,
    [Permission.read(Role.any())]
  );
  return result.$id;
}

export async function updateDua(id: string, data: Partial<import('../types').Dua>): Promise<void> {
  await adminDatabases.updateDocument(DATABASE_ID, DUAS_COLLECTION, id, data);
}

export async function deleteDua(id: string): Promise<void> {
  await adminDatabases.deleteDocument(DATABASE_ID, DUAS_COLLECTION, id);
}

export async function createRadioStation(data: Omit<import('../types').RadioStation, '$id'>): Promise<string> {
  const result = await adminDatabases.createDocument(
    DATABASE_ID,
    RADIO_COLLECTION,
    ID.unique(),
    data,
    [Permission.read(Role.any())]
  );
  return result.$id;
}

export async function updateRadioStation(id: string, data: Partial<import('../types').RadioStation>): Promise<void> {
  await adminDatabases.updateDocument(DATABASE_ID, RADIO_COLLECTION, id, data);
}

export async function deleteRadioStation(id: string): Promise<void> {
  await adminDatabases.deleteDocument(DATABASE_ID, RADIO_COLLECTION, id);
}