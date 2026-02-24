import { Client, Functions } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const YOUTUBE_FUNCTION_ID = import.meta.env.VITE_YOUTUBE_FUNCTION_ID || 'youtube-import';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const functions = new Functions(client);

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  author: string;
  viewCount: number;
}

export interface YouTubeImportResult {
  success: boolean;
  data?: {
    fileId: string;
    fileName: string;
    fileSize: number;
    url: string;
    duration: number;
    title: string;
    thumbnail: string;
  };
  error?: string;
}

export interface YouTubeInfoResult {
  success: boolean;
  data?: YouTubeVideoInfo;
  error?: string;
}

export async function getYouTubeInfo(url: string): Promise<YouTubeInfoResult> {
  try {
    const result = await functions.createExecution(
      YOUTUBE_FUNCTION_ID,
      JSON.stringify({ url, action: 'info' })
    );
    
    if (result.status !== 'completed') {
      const errorData = JSON.parse(result.responseBody || '{}');
      return { success: false, error: errorData.error || errorData.message || 'Function failed' };
    }

    const data = JSON.parse(result.responseBody);
    return {
      success: data.success ?? true,
      data: data.data,
      error: data.error
    };
  } catch (error: any) {
    console.error('YouTube info fetch error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function importFromYouTube(url: string, title?: string): Promise<YouTubeImportResult> {
  try {
    const result = await functions.createExecution(
      YOUTUBE_FUNCTION_ID,
      JSON.stringify({ url, action: 'download', title })
    );
    
    if (result.status !== 'completed') {
      const errorData = JSON.parse(result.responseBody || '{}');
      return { success: false, error: errorData.error || errorData.message || 'Function failed' };
    }

    const data = JSON.parse(result.responseBody);
    return {
      success: data.success ?? true,
      data: data.data,
      error: data.error
    };
  } catch (error: any) {
    console.error('YouTube import error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}
