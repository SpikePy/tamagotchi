// Benachrichtigungen, solange die App im Hintergrund läuft.
export async function requestNotifications(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export async function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: 'icons/icon-192.png', tag: 'pet', renotify: true } as NotificationOptions);
    else new Notification(title, { body, icon: 'icons/icon-192.png' });
  } catch {
    /* nicht unterstützt */
  }
}
