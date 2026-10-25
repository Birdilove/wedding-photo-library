// Placeholders: edit freely.
export const limits = { cameraMaxPhotos: 5, maxPixels: 4_000_000, jpegQuality: 0.7, uploadConcurrency: 3 };
export const wedding = {
  appName: 'Wedding Photos Library',
  couple: 'Manpreet & Lovepreet',
  date: 'Our Wedding Day',
  welcome: 'Help us capture the little moments that make today unforgettable.',
  footer: 'Made for Manpreet',
};
// Edit this list to change the photo cues guests see.
const subjects = ['the food stalls', 'the wedding venue', 'the stage', 'Gurudwara Sahib', 'the decorations',
  'family and friends together', 'the dance floor', 'the happy couple'];
export const cues = subjects.map(s => `Take ${limits.cameraMaxPhotos} photos of ${s}`);

const KEY = 'wedding-cues-seen';
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
/** Random cue the guest hasn't done yet; once all are done, starts over. */
export function pickCue(): string {
  const seen = read(); let left = cues.filter(c => !seen.includes(c)); if (!left.length) left = cues;
  return left[Math.floor(Math.random() * left.length)];
}
export function markCueSeen(cue: string) {
  const seen = read(); const next = cues.every(c => c === cue || seen.includes(c)) ? [] : [...seen, cue];
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: fine */ }
}
