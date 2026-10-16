import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { google } from 'googleapis';

export const config = { api: { bodyParser: false } };

const maxUploadBytes = 4 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

type Metadata = { source?: 'camera' | 'device'; originalName?: string; width?: number; height?: number; capturedAt?: string; cue?: string };

function driveAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    return auth;
  }

  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (credentials) return new google.auth.GoogleAuth({ credentials: JSON.parse(credentials), scopes: ['https://www.googleapis.com/auth/drive.file'] });

  // Names only, never values: shows which variable the running deployment cannot see.
  const missing = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN'].filter(name => !process.env[name]);
  throw new Error('Upload service is not configured. Missing: ' + missing.join(', '));
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

function safeName(value: string | undefined) {
  const base = (value || 'wedding-photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${base}`;
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
    if (!allowedTypes.has(photo.mimetype || '') || photo.size === 0 || photo.size > maxUploadBytes) return response.status(413).json({ error: 'Photos must be JPEG, PNG, or WebP and no larger than 4 MB.' });

    let metadata: Metadata = {};
    const metadataText = first(fields.metadata);
    if (typeof metadataText === 'string') {
      try { metadata = JSON.parse(metadataText) as Metadata; } catch { return response.status(400).json({ error: 'Invalid photo metadata.' }); }
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('Upload service is not configured. Missing: GOOGLE_DRIVE_FOLDER_ID');
    const drive = google.drive({ version: 'v3', auth: driveAuth() });
    const uploaded = await drive.files.create({
      requestBody: { name: safeName(metadata.originalName || photo.originalFilename || undefined), parents: [folderId], description: JSON.stringify({ source: metadata.source, width: metadata.width, height: metadata.height, capturedAt: metadata.capturedAt, cue: metadata.cue }) },
      media: { mimeType: photo.mimetype || undefined, body: createReadStream(photo.filepath) },
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
