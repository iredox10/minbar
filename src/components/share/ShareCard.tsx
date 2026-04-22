import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareCardProps {
  type: 'episode' | 'quote' | 'milestone' | 'playlist';
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  accentColor?: string;
  badge?: string;
  footer?: string;
  logo?: string;
  qrUrl?: string;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ type, title, subtitle, description, imageUrl, accentColor = '#10b981', badge, footer = 'Listen on Arewa Central', logo = 'Arewa Central', qrUrl }, ref) => {
    
    const bgGradient = type === 'quote' 
      ? 'from-emerald-900 via-emerald-800 to-emerald-900'
      : type === 'milestone'
      ? 'from-indigo-950 via-indigo-900 to-indigo-950'
      : type === 'playlist'
      ? 'from-violet-950 via-violet-900 to-violet-950'
      : 'from-slate-900 via-slate-800 to-slate-900';

    return (
      <div
        ref={ref}
        className="relative w-[1080px] h-[1080px] overflow-hidden"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`} />
        
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-32 left-16 w-48 h-48 rounded-full opacity-10" style={{ backgroundColor: accentColor }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5" style={{ backgroundColor: accentColor }} />
        
        {/* Border lines */}
        <div className="absolute top-16 left-16 right-16 h-[2px] opacity-30" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-16 left-16 right-16 h-[2px] opacity-30" style={{ backgroundColor: accentColor }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-20">
          {type === 'episode' && imageUrl && (
            <div className="mb-10">
              <div className="w-[400px] h-[400px] rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img 
                  src={imageUrl} 
                  alt={title}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-8xl" style="background-color: ${accentColor}30; color: ${accentColor};">🎧</div>`;
                    }
                  }}
                />
              </div>
            </div>
          )}

          {type === 'quote' && (
            <div className="mb-8 text-7xl opacity-40" style={{ color: accentColor }}>"</div>
          )}

          {type === 'milestone' && (
            <div className="text-9xl mb-8">🎧</div>
          )}

          {type === 'playlist' && (
            <div className="text-9xl mb-8">🎵</div>
          )}

          {badge && (
            <div 
              className="px-6 py-2 rounded-full mb-6 text-sm font-bold"
              style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
            >
              {badge}
            </div>
          )}

          <h1 className="text-5xl font-bold text-white text-center leading-tight mb-4 max-w-[800px]">
            {title}
          </h1>

          {subtitle && (
            <p className="text-3xl text-slate-400 text-center mb-4">{subtitle}</p>
          )}

          {description && (
            <p className="text-2xl text-slate-500 text-center mb-8 max-w-[700px]">{description}</p>
          )}

          {type === 'quote' && subtitle && (
            <p className="text-3xl font-semibold text-center mt-4" style={{ color: accentColor }}>
              — {subtitle}
            </p>
          )}

          {/* QR Code */}
          {qrUrl && (
            <div className="mt-8 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
              <QRCodeSVG value={qrUrl} size={120} level="M" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-20 left-0 right-0 text-center">
          <p className="text-slate-500 text-2xl mb-2">{footer}</p>
          <p className="text-3xl font-bold" style={{ color: accentColor }}>{logo}</p>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = 'ShareCard';
