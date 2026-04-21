import { Query, ID } from 'appwrite';
import { 
  databases, 
  DATABASE_ID, 
  USER_FAVORITES_COLLECTION, 
  USER_HISTORY_COLLECTION,
  USER_PLAYLISTS_COLLECTION,
  USER_PLAYLIST_ITEMS_COLLECTION
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

export async function syncPlaylists(userId: string) {
  if (!userId) return;

  try {
    const cloudPlaylists = await databases.listDocuments(
      DATABASE_ID,
      USER_PLAYLISTS_COLLECTION,
      [Query.equal('userId', userId), Query.limit(100)]
    );

    const localPlaylists = await db.playlists.toArray();

    const cloudPlaylistMap = new Map(); // map cloudId -> doc
    for (const doc of cloudPlaylists.documents) {
      cloudPlaylistMap.set(doc.$id, doc);
    }

    const localPlaylistMap = new Map(); // map appwriteId -> playlist
    for (const pl of localPlaylists) {
      if (pl.appwriteId) {
        localPlaylistMap.set(pl.appwriteId, pl);
      }
    }

    // Pull from cloud
    for (const doc of cloudPlaylists.documents) {
      let localPl = localPlaylistMap.get(doc.$id);
      
      if (!localPl) {
        // match by name?
        localPl = localPlaylists.find(p => p.name === doc.name);
      if (localPl) localPlaylistMap.set(doc.$id, localPl);
      }

      if (!localPl) {
        const newId = await db.playlists.add({
          appwriteId: doc.$id,
          name: doc.name,
          description: doc.description,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        });
        localPlaylistMap.set(doc.$id, { id: newId, appwriteId: doc.$id, name: doc.name });
      } else {
        const cloudUpdated = new Date(doc.updatedAt);
        if (!localPl.appwriteId || cloudUpdated > localPl.updatedAt) {
          await db.playlists.update(localPl.id!, {
            appwriteId: doc.$id,
            name: doc.name,
            description: doc.description,
            updatedAt: cloudUpdated,
          });
        }
      }
    }

    // Push to cloud
    for (const pl of localPlaylists) {
      if (!pl.appwriteId) {
        const newDoc = await databases.createDocument(
          DATABASE_ID,
          USER_PLAYLISTS_COLLECTION,
          ID.unique(),
          {
            userId,
            name: pl.name,
            description: pl.description || '',
            createdAt: pl.createdAt.toISOString(),
            updatedAt: pl.updatedAt.toISOString(),
          }
        );
        await db.playlists.update(pl.id!, { appwriteId: newDoc.$id });
        localPlaylistMap.set(newDoc.$id, { ...pl, appwriteId: newDoc.$id });
      } else {
        const cloudDoc = cloudPlaylistMap.get(pl.appwriteId);
        if (cloudDoc) {
          const cloudUpdated = new Date(cloudDoc.updatedAt);
          if (pl.updatedAt > cloudUpdated) {
            await databases.updateDocument(
              DATABASE_ID,
              USER_PLAYLISTS_COLLECTION,
              pl.appwriteId,
              {
                name: pl.name,
                description: pl.description || '',
                updatedAt: pl.updatedAt.toISOString(),
              }
            );
          }
        }
      }
    }

    // Now sync playlist items
    const cloudItems = await databases.listDocuments(
      DATABASE_ID,
      USER_PLAYLIST_ITEMS_COLLECTION,
      [Query.equal('userId', userId), Query.limit(500)]
    );

    const localItems = await db.playlistItems.toArray();

    // Pull items
    for (const doc of cloudItems.documents) {
      // Find local playlist id
      let localPlId: number | undefined;
      
      const plByAppwriteId = await db.playlists.filter(p => p.appwriteId === doc.playlistId).first();
      if (plByAppwriteId) localPlId = plByAppwriteId.id;

      if (!localPlId) continue;

      const existsLocal = localItems.find(i => i.playlistId === localPlId && i.episodeId === doc.episodeId);
      
      if (!existsLocal) {
        await db.playlistItems.add({
          appwriteId: doc.$id,
          playlistId: localPlId,
          episodeId: doc.episodeId,
          addedAt: new Date(doc.addedAt),
        });
      } else if (!existsLocal.appwriteId) {
        await db.playlistItems.update(existsLocal.id!, { appwriteId: doc.$id });
      }
    }

    // Push items
    for (const item of localItems) {
      if (!item.appwriteId) {
        const localPl = await db.playlists.get(item.playlistId);
        if (localPl && localPl.appwriteId) {
          const newDoc = await databases.createDocument(
            DATABASE_ID,
            USER_PLAYLIST_ITEMS_COLLECTION,
            ID.unique(),
            {
              userId,
              playlistId: localPl.appwriteId,
              episodeId: item.episodeId,
              addedAt: item.addedAt.toISOString(),
            }
          );
          await db.playlistItems.update(item.id!, { appwriteId: newDoc.$id });
        }
      }
    }

  } catch (error) {
    console.error('Sync playlists failed:', error);
  }
}

export async function syncUserData(userId: string) {
  await Promise.all([
    syncFavorites(userId),
    syncHistory(userId),
    syncPlaylists(userId)
  ]);
}
