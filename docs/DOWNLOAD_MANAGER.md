# CRATOR Download Manager — Architecture & Deployment Guide

## Architecture Overview

CRATOR's Download Manager is designed for **authorized media downloads only** (operator-configured authorized catalogs and verified open-license / Creative Commons titles). It never scrapes third-party copyrighted hosts, never defeats DRM, and never inspects or extracts streams from VidRift's cross-origin iframe.

### Core Components

1. **Source Adapter Architecture (`src/server/downloads/sourceAdapter.ts`)**
   - `DownloadSourceAdapter` interface: `getAvailableDownloads()`, `getSeasonEpisodes()`, `validateDownloadSource()`, `getDownloadMetadata()`, `createDownloadJob()`.
   - `AuthorizedCatalogAdapter`: loads operator-permitted downloadable titles from `DOWNLOAD_CATALOG_PATH` or `DOWNLOAD_AUTHORIZED_CATALOG_JSON`.
   - `PublicDomainArchiveAdapter`: provides verified Creative Commons / Public Domain films (Big Buck Bunny, Sintel, Elephants Dream, Tears of Steel) and a 3-episode open-cinema series (`Open Cinema Anthology`, ID `900001`).
   - Titles without an authorized download adapter (including VidRift-only streaming titles) cleanly return: `"Downloads are unavailable for this source."`

2. **Download Engine (`src/server/downloads/aria2Client.ts` & `src/server/downloads/downloadManager.ts`)**
   - **Primary Engine — aria2 JSON-RPC 2.0**: connects server-side to `ARIA2_RPC_URL` using `token:<ARIA2_RPC_SECRET>`. Supports multi-connection segmented transfers (`split`, `max-connection-per-server`), live progress/speed/ETA polling, pause (`aria2.pause`), resume (`aria2.unpause`), and cancel (`aria2.forceRemove`).
   - **Automatic Resumable HTTP Fallback**: when `aria2c` is not reachable (e.g., local development), falls back seamlessly to a streaming Node HTTP/HTTPS `Range` engine supporting pause, resume from `.part` byte offset, per-hop SSRF redirect checks, speed/ETA telemetry, and retry.
   - **Queue & Persistence**: enforces `DOWNLOAD_MAX_CONCURRENCY` (alias `DOWNLOAD_MAX_CONCURRENT`, default `3`), prevents duplicate active jobs, supports queue reordering, and persists job metadata atomically to `DOWNLOAD_STATE_FILE` (default `/tmp/crator-downloads/state.json`) for recovery after backend restarts.

3. **FFmpeg Post-Processing (`src/server/downloads/ffmpegService.ts`)**
   - Uses `ffprobe` via `execFile` (never shell interpolation) to verify completed media integrity and extract resolution/codec metadata.
   - Optional lossless container remuxing (`ffmpeg -c copy`) and subtitle muxing when requested.

4. **Security & Isolation (`src/server/downloads/security.ts`)**
   - All endpoints require authentication (Supabase JWT or HMAC-SHA256 signed `HttpOnly` session token via `POST /api/downloads/session`).
   - Strict user ownership checks (`job.userId === req.downloadUser.userId`).
   - Domain allowlist (`DOWNLOAD_ALLOWED_HOSTS`) + DNS private/loopback/link-local/metadata IP blocking (SSRF protection).
   - Filename & path sanitization preventing directory traversal, organizing completed files as:
     - `Downloads/<Movie Title> (<Year>)/<Filename>`
     - `Downloads/<Series Title>/Season 01/S01E01.<ext>`
   - Storage quotas, file-size limits, retention cleanup, and sliding-window rate limits.

## Deployment Architecture (Vercel + Dedicated Download Service)

Vercel Serverless Functions use ephemeral filesystems and short execution timeouts, making them unsuitable for hosting `aria2c`, FFmpeg, or large media files directly.

### Recommended Production Topology

1. **Frontend + Metadata API on Vercel**:
   - Deploy CRATOR normally to Vercel (`vercel.json` preserved).
   - Set `DOWNLOAD_SERVICE_URL=https://downloads.yourdomain.com` and `DOWNLOAD_SERVICE_API_KEY=<shared-secret>` in Vercel project environment variables.
   - CRATOR's `/api/downloads/*` routes automatically detect `VERCEL=1` and proxy authenticated download traffic to your dedicated persistent service.

2. **Dedicated Persistent Download Service (VPS / Docker / Railway / Fly.io)**:
   - Run `docker compose -f docker/docker-compose.downloads.yml up -d`.
   - `aria2` runs on an **internal Docker network only** (port `6800` is never exposed publicly).
   - Persistent volume `crator_downloads` is shared between `aria2` and `crator-download-service` at `/data/downloads`.
   - Configure `ARIA2_RPC_SECRET`, `DOWNLOAD_AUTH_SECRET`, and `DOWNLOAD_ALLOWED_HOSTS`.

### Health Check

```bash
curl -s http://localhost:3000/api/downloads/health
```

Returns engine status (`aria2` vs `native`), `aria2Connected`, `ffmpegAvailable`, `ffprobeAvailable`, `storageMode`, active concurrency limit, and storage usage.
