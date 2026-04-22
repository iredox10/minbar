import { toBlob } from 'html-to-image';
import { ShareCard } from '../components/share/ShareCard';

interface ShareCardOptions {
  type: 'episode' | 'quote' | 'milestone' | 'playlist';
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  accent?: string;
  logo?: string;
  badge?: string;
  footer?: string;
  qrUrl?: string;
}

export async function generateShareCard(options: ShareCardOptions): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const card = document.createElement('div');
  container.appendChild(card);

  const React = await import('react');
  const ReactDOM = await import('react-dom/client');

  const root = ReactDOM.createRoot(card);
  root.render(
    React.createElement(ShareCard, {
      type: options.type,
      title: options.title,
      subtitle: options.subtitle,
      description: options.description,
      imageUrl: options.imageUrl,
      accentColor: options.accent,
      logo: options.logo,
      badge: options.badge,
      footer: options.footer,
      qrUrl: options.qrUrl,
    })
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const blob = await toBlob(card, {
      quality: 1.0,
      pixelRatio: 1,
      cacheBust: true,
    });

    if (!blob) throw new Error('Failed to generate image');
    return blob;
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export async function downloadShareCard(blob: Blob, filename: string = 'arewa-central-share.png') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function shareCard(blob: Blob, title: string, text: string) {
  try {
    const file = new File([blob], 'arewa-central-share.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text
      });
      return true;
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Share failed:', err);
    }
  }
  return false;
}
