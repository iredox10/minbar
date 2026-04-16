import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');
import { Client, Databases } from 'node-appwrite';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.VITE_APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'muslim-central';

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const collections = ['series', 'episodes'];

  for (const coll of collections) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Adding tags to ${coll}...`);
        await databases.createStringAttribute(
          databaseId,
          coll,
          'tags',
          100,
          false,
          undefined,
          true
        );
        console.log(`✅ Attribute "tags" created successfully for ${coll}.`);
        break; // break retry loop
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`✓ Attribute "tags" already exists in ${coll}.`);
          break;
        }
        console.error(`❌ Failed to create tags for ${coll}: ${error.message}`);
        await sleep(attempt * 2000);
      }
    }
  }
}

run();