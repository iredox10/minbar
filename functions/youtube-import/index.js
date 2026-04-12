import { Client, Storage, ID, Permission, Role } from 'node-appwrite';

const COBALT_API = 'https://api.cobalt.tools';

export default async function ({ req, res, log, error }) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const storage = new Storage(client);
  
  const AUDIO_BUCKET = process.env.AUDIO_BUCKET || 'audio';
  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  try {
    let body = {};
    let titleOverride = null;
    
    log(`=== Request Debug ===`);
    log(`req.path: ${req.path}`);
    
    const pathParts = req.path.split('/').filter(p => p);
    log(`Path parts: ${JSON.stringify(pathParts)}`);
    
    if (pathParts.length >= 2) {
      const action = pathParts[0];
      const url = decodeURIComponent(pathParts[1]);
      body = { url, action };
      
      if (pathParts.length >= 3) {
        titleOverride = decodeURIComponent(pathParts[2]);
        log(`Title override: ${titleOverride}`);
      }
      
      log(`Parsed from path - url: ${url}, action: ${action}`);
    }
    
    if (!body.url) {
      try {
        if (req.bodyJson) {
          body = req.bodyJson;
          log(`Got body from bodyJson: ${JSON.stringify(body)}`);
        }
      } catch (e) {
        log(`bodyJson error: ${e.message}`);
      }
    }
    
    const { url, action } = body;
    log(`Final - url: ${url}, action: ${action}`);

    if (!url) {
      return res.json({ error: 'URL is required' }, 400);
    }

    if (!action) {
      return res.json({ error: 'Action is required (info or download)' }, 400);
    }

    // Extract video ID from URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    if (!videoId) {
      return res.json({ error: 'Invalid YouTube URL' }, 400);
    }
    
    log(`Video ID: ${videoId}`);

    if (action === 'info') {
      // Fetch video info from YouTube oEmbed
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      
      const oembedResponse = await fetch(oembedUrl);
      if (!oembedResponse.ok) {
        return res.json({ error: 'Failed to fetch video info from YouTube' }, 500);
      }
      
      const oembedData = await oembedResponse.json();
      
      return res.json({
        success: true,
        data: {
          id: videoId,
          title: oembedData.title || 'Unknown Title',
          description: '',
          duration: 0,
          thumbnail: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          author: oembedData.author_name || 'Unknown',
          viewCount: 0
        }
      });
    }

    if (action === 'download') {
      log(`Downloading audio using ytdl-core for: ${videoId}`);
      
      const ytdl = (await import('@distube/ytdl-core')).default;
      
      const info = await ytdl.getInfo(url);
      const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
      
      if (!format) {
        return res.json({ error: 'No suitable audio format found on YouTube' }, 400);
      }
      
      const stream = ytdl.downloadFromInfo(info, { format });
      const chunks = [];
      
      for await (const chunk of stream) {
         chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      log(`Downloaded ${buffer.length} bytes`);
      
      if (buffer.length > MAX_FILE_SIZE) {
        return res.json({ error: 'File too large (exceeds 100MB)' }, 400);
      }
      
      const title = titleOverride || info.videoDetails?.title || `youtube_${videoId}`;
      const safeTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().substring(0, 100);
      const ext = format.container === 'mp4' ? 'm4a' : 'webm';
      const fileName = `${safeTitle}.${ext}`;
      const mimeType = format.mimeType || (format.container === 'mp4' ? 'audio/mp4' : 'audio/webm');
      
      log(`Uploading file: ${fileName} as ${mimeType}`);
      
      const result = await storage.createFile(
        AUDIO_BUCKET,
        ID.unique(),
        {
          name: fileName,
          type: mimeType,
          size: buffer.length,
          data: buffer.toString('base64')
        },
        [Permission.read(Role.any())]
      );
      
      const fileUrl = `${process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}/storage/buckets/${AUDIO_BUCKET}/files/${result.$id}/view?project=${process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID}`;
      
      return res.json({
        success: true,
        data: {
          fileId: result.$id,
          fileName: fileName,
          fileSize: buffer.length,
          url: fileUrl,
          title: title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        }
      });
    }

    return res.json({ error: 'Invalid action. Use "info" or "download"' }, 400);
  } catch (err) {
    error(`Error: ${err.message}`);
    error(`Stack: ${err.stack}`);
    return res.json({ 
      error: 'Failed to process YouTube video', 
      message: err.message
    }, 500);
  }
}
