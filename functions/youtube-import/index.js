import { Client, Storage, ID, Permission, Role } from 'node-appwrite';
import ytdl from 'ytdl-core';

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
    
    if (req.body && typeof req.body === 'string') {
      body = JSON.parse(req.body);
      log(`Parsed body from string`);
    } else if (req.bodyJson) {
      body = req.bodyJson;
      log(`Got body from bodyJson`);
    } else if (req.body && typeof req.body === 'object') {
      body = req.body;
      log(`Got body as object`);
    }
    
    const { url, action } = body;

    if (!url) {
      return res.json({ error: 'URL is required' }, 400);
    }

    if (!ytdl.validateURL(url)) {
      return res.json({ error: 'Invalid YouTube URL' }, 400);
    }

    const videoId = ytdl.getURLVideoID(url);

    if (action === 'info') {
      log(`Fetching info for: ${videoId}`);
      
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      
      const formats = ytdl.filterFormats(info.formats, 'audioonly');
      const audioFormat = formats.find(f => f.audioBitrate && f.audioBitrate >= 128) || formats[0];
      
      return res.json({
        success: true,
        data: {
          id: videoId,
          title: videoDetails.title,
          description: videoDetails.description?.substring(0, 5000) || '',
          duration: parseInt(videoDetails.lengthSeconds, 10),
          thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          author: videoDetails.author?.name || 'Unknown',
          viewCount: parseInt(videoDetails.viewCount, 10) || 0,
          audioFormats: formats.slice(0, 5).map(f => ({
            itag: f.itag,
            bitrate: f.audioBitrate,
            container: f.container,
            size: f.contentLength ? parseInt(f.contentLength, 10) : null
          }))
        }
      });
    }

    if (action === 'download') {
      log(`Downloading audio from: ${videoId}`);
      
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      const title = body.title || videoDetails.title;
      
      const formats = ytdl.filterFormats(info.formats, 'audioonly');
      const audioFormat = formats.find(f => f.audioBitrate && f.audioBitrate >= 128) || formats[0];
      
      if (!audioFormat) {
        return res.json({ error: 'No suitable audio format found' }, 400);
      }
      
      const estimatedSize = audioFormat.contentLength ? parseInt(audioFormat.contentLength, 10) : 0;
      if (estimatedSize > MAX_FILE_SIZE) {
        return res.json({ error: `File too large: ${(estimatedSize / 1024 / 1024).toFixed(1)}MB exceeds 100MB limit` }, 400);
      }
      
      log(`Selected format: itag=${audioFormat.itag}, bitrate=${audioFormat.audioBitrate}`);
      
      const chunks = [];
      let totalSize = 0;
      
      const stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly'
      });
      
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
          chunks.push(chunk);
          totalSize += chunk.length;
          
          if (totalSize > MAX_FILE_SIZE) {
            stream.destroy();
            reject(new Error(`Download exceeded ${MAX_FILE_SIZE / 1024 / 1024}MB limit`));
          }
        });
        
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      log(`Downloaded ${chunks.length} chunks, total size: ${totalSize} bytes`);
      
      const buffer = Buffer.concat(chunks);
      const fileExtension = audioFormat.container || 'mp4';
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100)}.${fileExtension}`;
      
      log(`Uploading file: ${fileName}`);
      
      const result = await storage.createFile(
        AUDIO_BUCKET,
        ID.unique(),
        {
          name: fileName,
          type: audioFormat.mimeType || 'audio/mp4',
          size: buffer.length,
          data: buffer.toString('base64')
        },
        [
          Permission.read(Role.any())
        ]
      );
      
      const fileUrl = `${process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}/storage/buckets/${AUDIO_BUCKET}/files/${result.$id}/view?project=${process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID}`;
      
      return res.json({
        success: true,
        data: {
          fileId: result.$id,
          fileName: fileName,
          fileSize: buffer.length,
          url: fileUrl,
          duration: parseInt(videoDetails.lengthSeconds, 10),
          title: videoDetails.title,
          thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
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
