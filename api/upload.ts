import { google } from 'googleapis';

export const config = { api: { bodyParser: false } };

const maxUploadBytes = 4 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

type Metadata = { source?: 'camera' | 'device'; originalName?: string; width?: number; height?: number; capturedAt?: string };

function originHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (!allowedOrigin || origin !== allowedOrigin) return null;
  return { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin' };
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}

function safeName(value: string | undefined) {
  const base = (value || 'wedding-photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${base}`;
}

export default async function handler(request: Request) {
  const cors = originHeaders(request);
  if (!cors) return json({ error: 'This upload origin is not allowed.' }, 403, {});
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { ...cors, Allow: 'POST, OPTIONS' });

  try {
    const form = await request.formData();
    const photo = form.get('photo');
    if (!(photo instanceof File)) return json({ error: 'A photo is required.' }, 400, cors);
    if (!allowedTypes.has(photo.type)) return json({ error: 'Only JPEG, PNG, and WebP photos are supported.' }, 415, cors);
    if (photo.size === 0 || photo.size > maxUploadBytes) return json({ error: 'Photos must be no larger than 4 MB.' }, 413, cors);

    const metadataText = form.get('metadata');
    let metadata: Metadata = {};
    if (typeof metadataText === 'string') {
      try { metadata = JSON.parse(metadataText) as Metadata; } catch { return json({ error: 'Invalid photo metadata.' }, 400, cors); }
    }

    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!credentials || !folderId) throw new Error('Upload service is not configured.');
    const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(credentials), scopes: ['https://www.googleapis.com/auth/drive.file'] });
    const drive = google.drive({ version: 'v3', auth });
    const uploaded = await drive.files.create({
      requestBody: { name: safeName(metadata.originalName || photo.name), parents: [folderId], description: JSON.stringify({ source: metadata.source, width: metadata.width, height: metadata.height, capturedAt: metadata.capturedAt }) },
      media: { mimeType: photo.type, body: Buffer.from(await photo.arrayBuffer()) },
      fields: 'id',
    });
    return json({ id: uploaded.data.id }, 201, cors);
  } catch (error) {
    console.error('Drive upload failed', error instanceof Error ? error.message : error);
    return json({ error: 'Photo upload failed. Please retry.' }, 502, cors);
  }
}
