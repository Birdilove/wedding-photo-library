# Wedding photo sharing: Phase 1 (frontend only)

## Run locally
`npm install && npm run dev` → open http://localhost:5173 (camera needs localhost or HTTPS; test on a phone via an HTTPS tunnel).
`npm test` runs unit tests; `npm run build` type-checks and builds to `dist/`.
Edit names/welcome text/limits in `src/config/wedding.ts`.

## IMPORTANT: uploads are SIMULATED
`src/services/photoUploadService.ts` is a mock: it waits ~1s and reports success. **Nothing is sent anywhere and nothing reaches Google Drive**, even though the guest sees "Saved" and the thank-you screen. Append `?simulateFail` to the URL to make ~40% of uploads fail and test Retry.

## Deploy to GitHub Pages
Repo Settings → Pages → Source: GitHub Actions. Push to `main`; `.github/workflows/deploy.yml` builds and deploys.
Base path: defaults to `/<repo-name>/`. For a custom domain set the repo variable `BASE_PATH` to `/`. Locally: `VITE_BASE_PATH=/repo/ npm run build`.

## Google Drive uploads (Vercel)

The frontend is still hosted on GitHub Pages. Deploy this same repository to Vercel to host only `api/upload`.

1. For a personal Gmail Drive, create an OAuth 2.0 web client in Google Cloud and use the Google OAuth Playground to obtain a refresh token for your own account. For a Google Workspace Shared Drive, a service account is also supported.
2. Import the repository into Vercel. Add these Production environment variables there (never in GitHub Pages or the frontend):
   - `GOOGLE_DRIVE_FOLDER_ID`: the ID in the Drive folder URL.
   - Personal Gmail: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REFRESH_TOKEN`.
   - Shared Drive only: `GOOGLE_SERVICE_ACCOUNT_JSON`, the complete JSON from the service-account key.
   - `ALLOWED_ORIGIN`: `https://photos.birdistudios.com`
3. Set the GitHub repository variable `VITE_UPLOAD_API_URL` to `https://YOUR-VERCEL-PROJECT.vercel.app/api/upload`. GitHub Pages injects this during its existing build.
4. Redeploy GitHub Pages. Uploads are JPEG, PNG, or WebP and must be no larger than 4 MB. The app processes selected images into JPEG before sending them.

The endpoint accepts only the configured site origin and stores photos in the selected Drive folder. It does not expose Drive credentials or make photos public. Before the event, test on an iPhone and an Android phone with a Drive folder created specifically for the wedding.
