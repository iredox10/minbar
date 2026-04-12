import { Client, Functions } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

const functions = new Functions(client);

async function check() {
    const deployment = await functions.getDeployment(process.env.VITE_YOUTUBE_FUNCTION_ID, '69d67ab019c7a6b373d5');
    console.log('Status:', deployment.status);
    if (deployment.status === 'failed') {
        console.log('Error logs:', deployment.buildStderr);
    }
}
check();