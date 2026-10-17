/** Random per-browser ID (no personal data). Used by the server for a per-device upload limit. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem('wedding-device-id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('wedding-device-id', id); }
    return id;
  } catch { return sessionId ??= crypto.randomUUID(); } // storage blocked: stable for this page visit only
}
let sessionId: string | undefined;
