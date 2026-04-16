import { Query, ID } from 'appwrite';
import { 
  databases, 
  DATABASE_ID, 
  USER_FAVORITES_COLLECTION, 
  USER_HISTORY_COLLECTION
} from './appwrite';
import { db } from './db';

export async function syncFavorites(userId: string) {
  if (!userId) return;

  try {
    // 1. Pull from Cloud
    const cloudFavorites = await databases.listDocuments(
      DATABASE_ID,
      USER_FAVORITES_COLLECTION,
      [Query.equal('userId', userId), Query.limit(100)]
    );

    const localFavorites = await db.favorites.toArray();

    // 2. Merge logic (Simple Add missing to local)
    for (const doc of cloudFavorites.documents) {
      const existsLocal = localFavorites.find(f => f.type === doc.type && f.itemId === doc.itemId);
      if (!existsLocal) {
        await db.favorites.add({
          type: doc.type,
          itemId: doc.itemId,
          title: doc.title,
          imageUrl: doc.imageUrl,
          addedAt: new Date(doc.addedAt),
        });
      }
    }

    // 3. Push missing to Cloud
    for (const fav of localFavorites) {
      const existsCloud = cloudFavorites.documents.find((d: any) => d.type === fav.type && d.itemId === fav.itemId);
      if (!existsCloud) {
        await databases.createDocument(
          DATABASE_ID,
          USER_FAVORITES_COLLECTION,
          ID.unique(),
          {
            userId,
            type: fav.type,
            itemId: fav.itemId,
            title: fav.title,
            imageUrl: fav.imageUrl,
            addedAt: fav.addedAt.toISOString(),
          }
        );
      }
    }
  } catch (error) {
    console.error('Sync favorites failed:', error);
  }
}

export async function syncHistory(userId: string) {
  if (!userId) return;

  try {
    const cloudHistory = await databases.listDocuments(
      DATABASE_ID,
      USER_HISTORY_COLLECTION,
      [Query.equal('userId', userId), Query.limit(100)]
    );

    const localHistory = await db.playbackHistory.toArray();

    // Pull from cloud
    for (const doc of cloudHistory.documents) {
      const existsLocal = localHistory.find(h => h.episodeId === doc.episodeId);
      if (!existsLocal) {
        await db.playbackHistory.add({
          episodeId: doc.episodeId,
          position: doc.position,
          duration: doc.duration,
          playedAt: new Date(doc.playedAt),
          completed: doc.completed,
          title: doc.title,
          artworkUrl: doc.artworkUrl,
          audioUrl: doc.audioUrl,
          speaker: doc.speaker,
        });
      } else {
        // Update local if cloud is newer
        const cloudDate = new Date(doc.playedAt);
        if (cloudDate > existsLocal.playedAt) {
          await db.playbackHistory.update(existsLocal.id!, {
            position: doc.position,
            duration: doc.duration,
            playedAt: cloudDate,
            completed: doc.completed,
          });
        }
      }
    }

    // Push to cloud
    for (const hist of localHistory) {
      const cloudDoc = cloudHistory.documents.find((d: any) => d.episodeId === hist.episodeId);
      if (!cloudDoc) {
        await databases.createDocument(
          DATABASE_ID,
          USER_HISTORY_COLLECTION,
          ID.unique(),
          {
            userId,
            episodeId: hist.episodeId,
            position: hist.position,
            duration: hist.duration,
            playedAt: hist.playedAt.toISOString(),
            completed: hist.completed,
            title: hist.title,
            artworkUrl: hist.artworkUrl,
            audioUrl: hist.audioUrl,
            speaker: hist.speaker,
          }
        );
      } else {
        // Update cloud if local is newer
        const cloudDate = new Date(cloudDoc.playedAt);
        if (hist.playedAt > cloudDate) {
          await databases.updateDocument(
            DATABASE_ID,
            USER_HISTORY_COLLECTION,
            cloudDoc.$id,
            {
              position: hist.position,
              duration: hist.duration,
              playedAt: hist.playedAt.toISOString(),
              completed: hist.completed,
            }
          );
        }
      }
    }
  } catch (error) {
    console.error('Sync history failed:', error);
  }
}

export async function syncUserData(userId: string) {
  await Promise.all([
    syncFavorites(userId),
    syncHistory(userId),
  ]);
}
