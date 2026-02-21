import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.VITE_APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'muslim-central';
const imagesBucket = process.env.VITE_APPWRITE_IMAGES_BUCKET || 'images';
const audioBucket = process.env.VITE_APPWRITE_AUDIO_BUCKET || 'audio';

if (!projectId || !apiKey) {
  console.error('Error: VITE_APPWRITE_PROJECT_ID and VITE_APPWRITE_API_KEY are required in .env');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

async function createDatabase() {
  try {
    await databases.create(databaseId, 'Muslim Central');
    console.log(`✅ Database "${databaseId}" created`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`✓ Database "${databaseId}" already exists`);
    } else {
      throw error;
    }
  }
}

async function createCollection(collectionId: string, name: string, attributes: any[]) {
  try {
    await databases.createCollection(databaseId, collectionId, name, [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]);
    console.log(`✅ Collection "${collectionId}" created`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`✓ Collection "${collectionId}" already exists`);
    } else {
      throw error;
    }
  }

  for (const attr of attributes) {
    try {
      switch (attr.type) {
        case 'string':
          await databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size || 255, attr.required || false, attr.default, attr.array || false);
          break;
        case 'integer':
          await databases.createIntegerAttribute(databaseId, collectionId, attr.key, attr.required || false, attr.min, attr.max, attr.default, attr.array || false);
          break;
        case 'boolean':
          await databases.createBooleanAttribute(databaseId, collectionId, attr.key, attr.required || false, attr.default, attr.array || false);
          break;
        case 'datetime':
          await databases.createDatetimeAttribute(databaseId, collectionId, attr.key, attr.required || false, attr.default, attr.array || false);
          break;
      }
      console.log(`  ✓ Attribute "${attr.key}" added`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`  ✓ Attribute "${attr.key}" already exists`);
      } else {
        console.error(`  ✗ Failed to create attribute "${attr.key}":`, error.message);
      }
    }
  }
}

async function createBucket(bucketId: string, name: string) {
  try {
    await storage.createBucket(bucketId, name, [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ], false, undefined, undefined, ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    console.log(`✅ Bucket "${bucketId}" created`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`✓ Bucket "${bucketId}" already exists`);
    } else {
      throw error;
    }
  }
}

async function createIndexes(collectionId: string, indexes: any[]) {
  for (const index of indexes) {
    try {
      await databases.createIndex(databaseId, collectionId, index.key, index.type, index.attributes, index.orders);
      console.log(`  ✓ Index "${index.key}" created`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`  ✓ Index "${index.key}" already exists`);
      } else {
        console.error(`  ✗ Failed to create index "${index.key}":`, error.message);
      }
    }
  }
}

async function setup() {
  console.log('\n🚀 Setting up Appwrite for Muslim Central...\n');

  // Create database
  await createDatabase();

  // Create collections with attributes
  console.log('\n📦 Creating collections...\n');

  // Speakers
  await createCollection('speakers', 'Speakers', [
    { type: 'string', key: 'name', size: 255, required: true },
    { type: 'string', key: 'slug', size: 255, required: true },
    { type: 'string', key: 'bio', size: 2000, required: false },
    { type: 'string', key: 'imageUrl', size: 500, required: true },
    { type: 'boolean', key: 'featured', required: false, default: false },
    { type: 'datetime', key: 'createdAt', required: false }
  ]);
  await createIndexes('speakers', [
    { key: 'slug_index', type: 'unique', attributes: ['slug'] },
    { key: 'featured_index', type: 'key', attributes: ['featured'] }
  ]);

  // Series
  await createCollection('series', 'Series', [
    { type: 'string', key: 'title', size: 500, required: true },
    { type: 'string', key: 'slug', size: 255, required: true },
    { type: 'string', key: 'speakerId', size: 100, required: true },
    { type: 'string', key: 'description', size: 5000, required: false },
    { type: 'string', key: 'artworkUrl', size: 500, required: true },
    { type: 'string', key: 'category', size: 100, required: false },
    { type: 'integer', key: 'episodeCount', required: false, default: 0 },
    { type: 'datetime', key: 'createdAt', required: false }
  ]);
  await createIndexes('series', [
    { key: 'slug_index', type: 'unique', attributes: ['slug'] },
    { key: 'speaker_index', type: 'key', attributes: ['speakerId'] }
  ]);

  // Episodes
  await createCollection('episodes', 'Episodes', [
    { type: 'string', key: 'title', size: 500, required: true },
    { type: 'string', key: 'slug', size: 255, required: true },
    { type: 'string', key: 'seriesId', size: 100, required: true },
    { type: 'string', key: 'audioUrl', size: 1000, required: true },
    { type: 'integer', key: 'duration', required: true },
    { type: 'datetime', key: 'publishedAt', required: false },
    { type: 'string', key: 'description', size: 5000, required: false },
    { type: 'integer', key: 'episodeNumber', required: false, default: 1 }
  ]);
  await createIndexes('episodes', [
    { key: 'slug_index', type: 'unique', attributes: ['slug'] },
    { key: 'series_index', type: 'key', attributes: ['seriesId'] },
    { key: 'published_index', type: 'key', attributes: ['publishedAt'], orders: ['DESC'] }
  ]);

  // Duas
  await createCollection('duas', 'Duas', [
    { type: 'string', key: 'title', size: 255, required: true },
    { type: 'string', key: 'arabic', size: 5000, required: true },
    { type: 'string', key: 'transliteration', size: 5000, required: false },
    { type: 'string', key: 'translation', size: 5000, required: true },
    { type: 'string', key: 'reference', size: 500, required: true },
    { type: 'string', key: 'category', size: 50, required: true },
    { type: 'string', key: 'audioUrl', size: 1000, required: false },
    { type: 'integer', key: 'sortOrder', required: false, default: 0 }
  ]);
  await createIndexes('duas', [
    { key: 'category_index', type: 'key', attributes: ['category'] }
  ]);

  // Radio Stations
  await createCollection('radio_stations', 'Radio Stations', [
    { type: 'string', key: 'name', size: 255, required: true },
    { type: 'string', key: 'streamUrl', size: 1000, required: true },
    { type: 'string', key: 'logoUrl', size: 500, required: false },
    { type: 'string', key: 'description', size: 1000, required: false },
    { type: 'boolean', key: 'isLive', required: false, default: true }
  ]);

  // Analytics
  await createCollection('analytics', 'Analytics', [
    { type: 'string', key: 'eventType', size: 50, required: true },
    { type: 'string', key: 'itemId', size: 100, required: false },
    { type: 'string', key: 'itemType', size: 50, required: false },
    { type: 'string', key: 'itemTitle', size: 500, required: false },
    { type: 'integer', key: 'duration', required: false },
    { type: 'string', key: 'userId', size: 100, required: false },
    { type: 'string', key: 'sessionId', size: 100, required: false },
    { type: 'datetime', key: 'timestamp', required: true }
  ]);
  await createIndexes('analytics', [
    { key: 'event_type_index', type: 'key', attributes: ['eventType'] },
    { key: 'timestamp_index', type: 'key', attributes: ['timestamp'], orders: ['DESC'] },
    { key: 'item_index', type: 'key', attributes: ['itemId'] }
  ]);

  // Create storage buckets
  console.log('\n🗑️ Creating storage buckets...\n');
  
  try {
    await createBucket(imagesBucket, 'Images');
  } catch (error: any) {
    console.log(`✓ Bucket "${imagesBucket}" setup complete`);
  }

  try {
    await storage.createBucket(audioBucket, 'Audio', [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ], false, undefined, undefined, ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']);
    console.log(`✅ Bucket "${audioBucket}" created`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`✓ Bucket "${audioBucket}" already exists`);
    }
  }

  console.log('\n✅ Setup complete!\n');
  console.log('Next steps:');
  console.log('1. Go to Appwrite Console → Auth → Users');
  console.log('2. Create an admin user with email/password');
  console.log('3. Login at /admin to start adding content\n');
}

setup().catch(console.error);
