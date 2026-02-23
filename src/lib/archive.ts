export interface ArchiveFile {
  name: string;
  source: string;
  format: string;
  length?: string;
  title?: string;
  track?: string;
  size?: string;
}

export interface ArchiveMetadata {
  metadata: {
    identifier?: string;
    title?: string;
    creator?: string;
    description?: string;
    subject?: string;
    date?: string;
  };
  files: ArchiveFile[];
}

export interface ParsedArchiveItem {
  identifier: string;
  title: string;
  creator: string;
  description: string;
  audioFiles: Array<{
    name: string;
    title: string;
    duration: number;
    url: string;
    size: number;
  }>;
}

export async function fetchArchiveMetadata(identifier: string): Promise<ArchiveMetadata | null> {
  // Clean the identifier - remove spaces, use proper encoding
  const cleanIdentifier = identifier.trim().replace(/\s+/g, '-');
  const archiveUrl = `https://archive.org/metadata/${cleanIdentifier}`;
  
  console.log('Fetching archive metadata for:', cleanIdentifier);
  console.log('Archive URL:', archiveUrl);
  
  // Try multiple CORS proxies
  const corsProxies = [
    `https://corsproxy.io/?${encodeURIComponent(archiveUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(archiveUrl)}`,
    `https://cors-anywhere.herokuapp.com/${archiveUrl}`,
    archiveUrl // Try direct as last resort
  ];
  
  for (const proxyUrl of corsProxies) {
    try {
      console.log('Trying:', proxyUrl);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Failed with status:', response.status);
        continue;
      }
      
      const text = await response.text();
      console.log('Response text (first 500 chars):', text.substring(0, 500));
      
      try {
        const data = JSON.parse(text);
        console.log('Success! Found', data.files?.length || 0, 'files');
        return data;
      } catch (parseError) {
        console.log('JSON parse failed, response was:', text.substring(0, 200));
        continue;
      }
    } catch (error) {
      console.log('Proxy failed:', error);
      continue;
    }
  }
  
  console.error('All CORS proxies failed');
  return null;
}

export function getArchiveFileUrl(identifier: string, fileName: string): string {
  // Don't over-encode - archive.org expects the identifier as-is and filename with spaces encoded
  const encodedFileName = fileName.replace(/ /g, '%20');
  return `https://archive.org/download/${identifier}/${encodedFileName}`;
}

export function formatArchiveDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  const seconds = parseInt(durationStr, 10);
  return isNaN(seconds) ? 0 : seconds;
}

export function parseArchiveItem(metadata: ArchiveMetadata): ParsedArchiveItem {
  const identifier = metadata.metadata.identifier || '';
  const title = metadata.metadata.title || identifier;
  const creator = metadata.metadata.creator || 'Unknown Speaker';
  const description = metadata.metadata.description || '';
  
  const audioExtensions = ['mp3', 'mp4', 'm4a', 'ogg', 'wav', 'flac', 'wma'];
  
  console.log('Parsing archive item:', identifier);
  console.log('Total files in response:', metadata.files?.length);
  
  const audioFiles = metadata.files
    .filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isAudio = audioExtensions.includes(ext);
      // Accept both original and derivative sources
      const isValidSource = file.source === 'original' || file.format?.toLowerCase().includes('mp3') || file.format?.toLowerCase().includes('audio');
      
      if (isAudio) {
        console.log('Found audio file:', file.name, 'source:', file.source, 'format:', file.format);
      }
      
      return isAudio && isValidSource;
    })
    .map(file => ({
      name: file.name,
      title: file.title || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      duration: formatArchiveDuration(file.length || ''),
      url: getArchiveFileUrl(identifier, file.name),
      size: parseInt(file.size || '0', 10)
    }))
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/^\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/^\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

  console.log('Parsed audio files:', audioFiles.length);

  return {
    identifier,
    title,
    creator,
    description,
    audioFiles
  };
}