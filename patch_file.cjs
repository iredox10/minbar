const fs = require('fs');

function replaceStrings(file, replacements) {
  let content = fs.readFileSync(file, 'utf-8');
  for (const [oldStr, newStr] of replacements) {
    content = content.replace(oldStr, newStr);
  }
  fs.writeFileSync(file, content, 'utf-8');
}

// SupportBanner
replaceStrings('src/components/SupportBanner.tsx', [
  [
    `import { useAppSettings } from '../hooks/useAppSettings';`,
    `import { useAppSettings } from '../hooks/useAppSettings';\nimport { useTranslation } from '../hooks/useTranslation';`
  ],
  [
    `const { settings, loading } = useAppSettings();`,
    `const { settings, loading } = useAppSettings();\n  const { t } = useTranslation();`
  ],
  [
    `Keep the App Running`,
    `{t('keepAppRunning')}`
  ],
  [
    `Arewa Central is free and ad-free. Support us to cover server costs and keep beneficial knowledge accessible to everyone.`,
    `{t('supportUsDesc')}`
  ],
  [
    `>
              Donate Now
            </Link>`,
    `>
              {t('donateNow')}
            </Link>`
  ]
]);

// InstallButton
replaceStrings('src/components/InstallButton.tsx', [
  [
    `import { cn } from '../lib/utils';`,
    `import { cn } from '../lib/utils';\nimport { useTranslation } from '../hooks/useTranslation';`
  ],
  [
    `function IOSSheet({ onClose }: { onClose: () => void }) {`,
    `function IOSSheet({ onClose }: { onClose: () => void }) {\n  const { t } = useTranslation();`
  ],
  [
    `Add to Home Screen</h3>`,
    `{t('addToHomeScreen')}</h3>`
  ],
  [
    `Install Arewa Central as an app</p>`,
    `{t('installArewaCentralAsApp')}</p>`
  ],
  [
    `Tap the <strong className="text-slate-100">Share</strong> button in Safari's toolbar`,
    `{t('tapThe')} <strong className="text-slate-100">{t('share')}</strong> {t('buttonInSafariToolbar')}`
  ],
  [
    `<span>Share</span>`,
    `<span>{t('share')}</span>`
  ],
  [
    `Scroll down and tap <strong className="text-slate-100">Add to Home Screen</strong>`,
    `{t('scrollDownAndTap')} <strong className="text-slate-100">{t('addToHomeScreen')}</strong>`
  ],
  [
    `<span>Add to Home Screen</span>`,
    `<span>{t('addToHomeScreen')}</span>`
  ],
  [
    `Tap <strong className="text-slate-100">Add</strong> in the top-right corner`,
    `{t('tap')} <strong className="text-slate-100">{t('add')}</strong> {t('inTopRightCorner')}`
  ],
  [
    `>
            Got it
          </button>`,
    `>
            {t('gotIt')}
          </button>`
  ],
  [
    `const [showIOSSheet, setShowIOSSheet] = useState(false);`,
    `const [showIOSSheet, setShowIOSSheet] = useState(false);\n  const { t } = useTranslation();`
  ],
  [
    `App Installed</p>`,
    `{t('appInstalled')}</p>`
  ],
  [
    `You're using the installed version</p>`,
    `{t('usingInstalledVersion')}</p>`
  ],
  [
    `{installing ? 'Installing…' : 'Install App'}`,
    `{installing ? t('installingApp') : t('installApp')}`
  ],
  [
    `Add to home screen for quick access</p>`,
    `{t('addToHomeScreenQuickAccess')}</p>`
  ],
  [
    `Install App</p>`,
    `{t('installApp')}</p>`
  ],
  [
    `Tap Share → Add to Home Screen</p>`,
    `{t('tapShareAddToHomeScreen')}</p>`
  ]
]);

// PWAInstallBanner
replaceStrings('src/components/layout/PWAInstallBanner.tsx', [
  [
    `import { usePWAInstall } from '../../hooks/usePWAInstall';`,
    `import { usePWAInstall } from '../../hooks/usePWAInstall';\nimport { useTranslation } from '../../hooks/useTranslation';`
  ],
  [
    `function IOSInstructionSheet({ onClose }: { onClose: () => void }) {`,
    `function IOSInstructionSheet({ onClose }: { onClose: () => void }) {\n  const { t } = useTranslation();`
  ],
  [
    `Add to Home Screen</h3>`,
    `{t('addToHomeScreen')}</h3>`
  ],
  [
    `Install Arewa Central as an app</p>`,
    `{t('installArewaCentralAsApp')}</p>`
  ],
  [
    `Tap the <strong className="text-slate-100">Share</strong> button in Safari's toolbar`,
    `{t('tapThe')} <strong className="text-slate-100">{t('share')}</strong> {t('buttonInSafariToolbar')}`
  ],
  [
    `<span>Share</span>`,
    `<span>{t('share')}</span>`
  ],
  [
    `Scroll down and tap <strong className="text-slate-100">Add to Home Screen</strong>`,
    `{t('scrollDownAndTap')} <strong className="text-slate-100">{t('addToHomeScreen')}</strong>`
  ],
  [
    `<span>Add to Home Screen</span>`,
    `<span>{t('addToHomeScreen')}</span>`
  ],
  [
    `Tap <strong className="text-slate-100">Add</strong> in the top-right corner`,
    `{t('tap')} <strong className="text-slate-100">{t('add')}</strong> {t('inTopRightCorner')}`
  ],
  [
    `>
          Got it
        </button>`,
    `>
          {t('gotIt')}
        </button>`
  ],
  [
    `const [installing, setInstalling] = useState(false);`,
    `const [installing, setInstalling] = useState(false);\n  const { t } = useTranslation();`
  ],
  [
    `Install Arewa Central`,
    `{t('installArewaCentral')}`
  ],
  [
    `Free Islamic Podcasts &amp; Duas — No Ads`,
    `{t('freeIslamicPodcasts')}`
  ],
  [
    `{installing ? 'Installing…' : isIOS() ? 'How to' : 'Install'}`,
    `{installing ? t('installingApp') : isIOS() ? t('howTo') : t('install')}`
  ]
]);

// DownloadButton
replaceStrings('src/components/audio/DownloadButton.tsx', [
  [
    `import type { Episode, Series } from '../../types';`,
    `import type { Episode, Series } from '../../types';\nimport { useTranslation } from '../../hooks/useTranslation';`
  ],
  [
    `episode.duration
  );`,
    `episode.duration
  );\n  const { t } = useTranslation();`
  ],
  [
    `title="Downloaded"`,
    `title={t('downloaded')}`
  ],
  [
    `title={\`Downloading... \${progress}%. Click to cancel.\`}`,
    `title={t('downloadingProgress').replace('{{progress}}', progress.toString())}`
  ],
  [
    `title={errorMessage || 'Download failed'}`,
    `title={errorMessage || t('downloadFailedBtn')}`
  ],
  [
    `title="Download Episode"`,
    `title={t('downloadEpisode')}`
  ]
]);

