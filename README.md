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

## Phase 2 (Google Drive) still to do
1. Backend endpoint (e.g. serverless function) holding Google service-account credentials server-side only.
2. Implement `PhotoUploadService` as an HTTP client (signed/resumable upload to Drive); swap it in `photoUploadService.ts`.
3. Abuse protection (rate limits, size/type checks, optional event token), CORS for your domain, retries/backoff.
4. Confirm HEIC handling and real-device camera testing on iOS Safari and Android Chrome.
