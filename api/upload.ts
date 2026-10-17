import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import { createReadStream } from 'node:fs';
import { open, rm } from 'node:fs/promises';
import { google, type drive_v3 } from 'googleapis';

export const config = { api: { bodyParser: false } };

const maxUploadBytes = 4 * 1024 * 1024;
const maxFilesPerDevice = 1000;
const folderMime = 'application/vnd.google-apps.folder';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

type Metadata = { source?: 'camera' | 'device'; originalName?: string; width?: number; height?: number; capturedAt?: string; cue?: string; deviceId?: string };

// The token only has the narrow drive.file scope, so this app can only see files and folders it created itself.
function driveAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    const missing = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN'].filter(n => !process.env[n]);
    throw new Error('Upload service is not configured. Missing: ' + missing.join(', ')); // names only, never values
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

let cachedFolderId: string | undefined;
/** Finds (or creates) the app's own wedding folder. If two instances race, all converge on the oldest one. */
async function getFolderId(drive: drive_v3.Drive) {
  if (cachedFolderId) return cachedFolderId;
  const name = (process.env.DRIVE_FOLDER_NAME || 'Wedding Photos').replace(/['\\]/g, '');
  const find = async () => (await drive.files.list({ q: `name='${name}' and mimeType='${folderMime}' and trashed=false`, orderBy: 'createdTime', pageSize: 5, fields: 'files(id)' })).data.files?.[0]?.id;
  let id = await find();
  if (!id) { await drive.files.create({ requestBody: { name, mimeType: folderMime }, fields: 'id' }); id = await find(); }
  if (!id) throw new Error('Could not create the Drive folder.');
  return (cachedFolderId = id);
}

/** Checks the file's real signature (not the sender's claimed type). Returns the true type or undefined. */
async function sniffImageType(path: string) {
  const handle = await open(path, 'r');
  try {
    const b = new Uint8Array(12); await handle.read(b, 0, 12, 0);
    const text = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
    if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  } finally { await handle.close(); }
  return undefined;
}

function applyCors(request: VercelRequest, response: VercelResponse) {
  const origin = request.headers.origin;
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (!allowedOrigin || origin !== allowedOrigin) return false;
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Max-Age', '86400');
  response.setHeader('Vary', 'Origin');
  return true;
}

function parseForm(request: VercelRequest) {
  const form = formidable({ maxFiles: 1, maxFileSize: maxUploadBytes, maxTotalFileSize: maxUploadBytes, filter: part => allowedTypes.has(part.mimetype || '') });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(request, (error, fields, files) => error ? reject(error) : resolve({ fields, files }));
  });
}

function first<T>(value: T | T[] | undefined) { return Array.isArray(value) ? value[0] : value; }

function safeName(value: string | undefined, type: string) {
  const base = (value || 'wedding-photo').replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${base}.${ext}`;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!applyCors(request, response)) return response.status(403).json({ error: 'This upload origin is not allowed.' });
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.setHeader('Allow', 'POST, OPTIONS').status(405).json({ error: 'Method not allowed.' });

  let temporaryPath: string | undefined;
  try {
    const { fields, files } = await parseForm(request);
    const photo = first(files.photo);
    if (!photo) return response.status(400).json({ error: 'A photo is required.' });
    temporaryPath = photo.filepath;
    if (photo.size === 0 || photo.size > maxUploadBytes) return response.status(413).json({ error: 'Photos must be no larger than 4 MB.' });
    const realType = await sniffImageType(photo.filepath);
    if (!realType) return response.status(415).json({ error: 'That file is not a valid JPEG, PNG, or WebP image.' });

    let metadata: Metadata = {};
    const metadataText = first(fields.metadata);
    if (typeof metadataText === 'string') {
      try { metadata = JSON.parse(metadataText) as Metadata; } catch { return response.status(400).json({ error: 'Invalid photo metadata.' }); }
    }
    const deviceId = metadata.deviceId;
    if (typeof deviceId !== 'string' || !uuidPattern.test(deviceId)) return response.status(400).json({ error: 'Invalid device.' });

    const drive = google.drive({ version: 'v3', auth: driveAuth() });
    const folderId = await getFolderId(drive);

    // Soft per-device cap, counted from the files this device already saved (a returned page of 1000 means the cap is reached).
    const existing = await drive.files.list({ q: `'${folderId}' in parents and appProperties has { key='deviceId' and value='${deviceId}' } and trashed=false`, pageSize: maxFilesPerDevice, fields: 'files(id)' });
    if ((existing.data.files?.length ?? 0) >= maxFilesPerDevice) return response.status(429).json({ error: 'This device has reached the photo limit. Thank you!' });

    const cue = typeof metadata.cue === 'string' ? metadata.cue.slice(0, 120) : undefined;
    const uploaded = await drive.files.create({
      requestBody: {
        name: safeName(metadata.originalName || photo.originalFilename || undefined, realType), parents: [folderId],
        appProperties: { deviceId },
        description: JSON.stringify({ source: metadata.source, width: metadata.width, height: metadata.height, capturedAt: metadata.capturedAt, cue }),
      },
      media: { mimeType: realType, body: createReadStream(photo.filepath) },
      fields: 'id',
    });
    return response.status(201).json({ id: uploaded.data.id });
  } catch (error) {
    console.error('Drive upload failed', error instanceof Error ? error.message : error);
    return response.status(502).json({ error: 'Photo upload failed. Please retry.' });
  } finally {
    if (temporaryPath) await rm(temporaryPath, { force: true });
  }
}
