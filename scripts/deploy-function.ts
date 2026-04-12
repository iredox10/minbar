import { Client, Functions } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

const functions = new Functions(client);

async function deploy() {
    try {
        console.log('Packaging function code...');
        const functionDir = path.resolve(process.cwd(), 'functions/youtube-import');
        const archivePath = path.resolve(process.cwd(), 'youtube-import.tar.gz');
        
        execSync(`tar -czvf ${archivePath} --exclude='node_modules' -C ${functionDir} .`, { stdio: 'ignore' });

        console.log('Deploying function...', process.env.VITE_YOUTUBE_FUNCTION_ID);
        
        const file = InputFile.fromPath(archivePath, 'youtube-import.tar.gz');
        
        const result = await functions.createDeployment(
            process.env.VITE_YOUTUBE_FUNCTION_ID, // functionId
            file,                                 // code
            true,                                 // activate
            'index.js',                           // entrypoint
            'npm install'                         // build commands
        );
        
        console.log('✅ Deployment created successfully! ID:', result.$id);
        console.log('Status:', result.status);
        
        // Cleanup archive
        if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
        }
        
    } catch (e) {
        console.error('Error during deployment:', e);
    }
}

deploy();
