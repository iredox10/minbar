import { adminLogin, adminDatabases, DATABASE_ID } from './src/lib/admin.ts';
import { Query } from 'appwrite';

async function test() {
  try {
    const res = await adminDatabases.listDocuments(DATABASE_ID, 'analytics', [
      Query.limit(5000)
    ]);
    console.log('Success', res.total);
  } catch (err) {
    console.error('Failed', err);
  }
}
test();