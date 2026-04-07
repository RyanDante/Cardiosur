import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // If no deferred prompt, try to guide user to manual installation
      alert('To install this app:\n\n1. Tap the share button in your browser\n2. Select "Add to Home Screen"\n3. Tap "Add"');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  // Don't show if already installed
  if (isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed top-4 right-4 z-50 bg-[#6dfa7e] text-[#121826] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium text-sm hover:bg-[#5ce86d] transition-colors"
    >
      <Download size={16} />
      Install App
    </button>
  );
}