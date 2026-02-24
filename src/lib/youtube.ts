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

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function getYouTubeInfo(url: string): Promise<YouTubeInfoResult> {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return { success: false, error: 'Invalid YouTube URL' };
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch video info from YouTube' };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data: {
        id: videoId,
        title: data.title || 'Unknown Title',
        description: '',
        duration: 0,
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        author: data.author_name || 'Unknown',
        viewCount: 0
      }
    };
  } catch (error: any) {
    console.error('YouTube info fetch error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function importFromYouTube(url: string, title?: string): Promise<YouTubeImportResult> {
  try {
    // Pass data via path since Appwrite SDK doesn't pass body correctly
    const action = 'download';
    const dataUrl = title ? `${url}?title=${encodeURIComponent(title)}` : url;
    const path = `/${action}/${encodeURIComponent(dataUrl)}`;
    
    console.log('Calling function with path:', path);
    
    const result = await functions.createExecution({
      functionId: YOUTUBE_FUNCTION_ID,
      body: '',
      async: false,
      xpath: path
    });
    
    console.log('Function execution result:', result);
    
    if (result.status !== 'completed') {
      const errorData = JSON.parse(result.responseBody || '{}');
      return { success: false, error: errorData.error || errorData.message || `Function ${result.status}` };
    }

    const respData = JSON.parse(result.responseBody);
    return {
      success: respData.success ?? true,
      data: respData.data,
      error: respData.error
    };
  } catch (error: any) {
    console.error('YouTube import error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}
