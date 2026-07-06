'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Download, X } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Mounted once in src/app/admin/layout.tsx so it covers the whole admin
// area (login + dashboard). Registers the service worker unconditionally
// (needed for push regardless of whether the install banner shows), then
// surfaces an install-to-home-screen offer on mobile and a
// enable-notifications offer on any platform, each only while genuinely
// actionable (not already installed / not already decided).
export default function PwaBootstrap() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [dismissed, setDismissed] = useState(true); // default hidden until effects settle, avoids a flash
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => {});
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
    setIsIos(/iPhone|iPad|iPod/i.test(ua));

    setNotifPermission('Notification' in window ? Notification.permission : 'unsupported');

    let dismissedBefore = false;
    try {
      dismissedBefore = sessionStorage.getItem('admin-pwa-banner-dismissed') === '1';
    } catch {
      /* sessionStorage unavailable (private mode etc) - just show the banner */
    }
    setDismissed(dismissedBefore);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const handleEnableNotifications = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== 'granted') return;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }
      await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('admin-pwa-banner-dismissed', '1');
    } catch {
      /* non-fatal */
    }
  };

  const showInstallOffer = !isStandalone && isMobile && (installEvent !== null || isIos);
  const showNotifOffer = notifPermission === 'default';

  if (dismissed || (!showInstallOffer && !showNotifOffer)) return null;

  const heading = showInstallOffer && showNotifOffer ? 'Get the app + alerts' : showInstallOffer ? 'Install the admin app' : 'Turn on notifications';

  return (
    <div className="fixed inset-x-3 bottom-3 z-[999] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:w-96">
      <button onClick={dismiss} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      <p className="pr-6 text-sm font-semibold text-gray-900">{heading}</p>
      <ul className="mt-1.5 space-y-1 text-xs text-gray-500">
        {showInstallOffer && (
          <li>
            {isIos
              ? 'Tap the Share icon, then "Add to Home Screen" to use this like an app.'
              : 'Add this to your home screen for one-tap access, even offline shell loading.'}
          </li>
        )}
        {showNotifOffer && <li>Get notified the moment a new inquiry comes in, even when the dashboard is closed.</li>}
      </ul>
      <div className="mt-3 flex gap-2">
        {showInstallOffer && !isIos && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 rounded-lg bg-[#B08D57] px-3 py-2 text-xs font-semibold text-white hover:bg-[#9a7a49]"
          >
            <Download className="h-3.5 w-3.5" /> Install
          </button>
        )}
        {showNotifOffer && (
          <button
            onClick={handleEnableNotifications}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" /> {busy ? 'Enabling…' : 'Enable notifications'}
          </button>
        )}
      </div>
    </div>
  );
}
