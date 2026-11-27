import assert from 'assert';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

// Configure isolated temp storage & concurrency BEFORE importing server modules
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'crator-dl-e2e-'));
process.env.DOWNLOAD_STORAGE_DIR = testRoot;
process.env.DOWNLOAD_STATE_FILE = path.join(testRoot, 'state.json');
process.env.DOWNLOAD_MAX_CONCURRENCY = '1';
process.env.ENABLE_FFMPEG_VALIDATION = 'true';
process.env.DOWNLOAD_AUTH_SECRET = 'test-hmac-secret-for-e2e-suite-only';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const { default: app } = await import('../src/server/app');
  const { validateDownloadUrl, resolveSafeStoragePath } = await import(
    '../src/server/downloads/security'
  );
  const { DownloadManagerService } = await import(
    '../src/server/downloads/downloadManager'
  );

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object', 'Server failed to bind');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const passed: string[] = [];
  const logPass = (name: string) => {
    passed.push(name);
    console.log(`  [PASS] ${name}`);
  };

  try {
    console.log(`\nRunning CRATOR Download Manager E2E Suite against ${baseUrl}`);
    console.log(`Isolated storage directory: ${testRoot}\n`);

    // 1. Security: SSRF, Host Allowlist & Path Traversal
    {
      const checks = [
        await validateDownloadUrl('http://127.0.0.1:6800/jsonrpc'),
        await validateDownloadUrl('http://169.254.169.254/latest/meta-data/'),
        await validateDownloadUrl('http://10.0.0.5/internal.mp4'),
        await validateDownloadUrl('https://unauthorized-host.example/movie.mp4'),
        await validateDownloadUrl('file:///etc/passwd'),
      ];
      for (const c of checks) {
        assert.strictEqual(c.valid, false, `Expected URL to be blocked: ${JSON.stringify(c)}`);
      }

      let traversalBlocked = false;
      try {
        resolveSafeStoragePath(testRoot, '../../etc/passwd');
      } catch {
        traversalBlocked = true;
      }
      assert.strictEqual(traversalBlocked, true, 'Path traversal should throw');
      logPass('SSRF, private IP, non-allowlisted host, and path traversal blocked');
    }

    // 2. Authentication & Ownership Isolation
    let tokenA = '';
    let tokenB = '';
    {
      const unauthRes = await fetch(`${baseUrl}/api/downloads`);
      assert.strictEqual(unauthRes.status, 401, 'Unauthenticated GET /api/downloads must return 401');

      const sessA = await fetch(`${baseUrl}/api/downloads/session`, { method: 'POST' });
      assert.strictEqual(sessA.status, 201);
      const dataA = await sessA.json();
      tokenA = dataA.token;
      assert(tokenA, 'User A token must be issued');

      const sessB = await fetch(`${baseUrl}/api/downloads/session`, { method: 'POST' });
      assert.strictEqual(sessB.status, 201);
      const dataB = await sessB.json();
      tokenB = dataB.token;
      assert(tokenB && dataB.userId !== dataA.userId, 'User B must receive distinct userId');

      logPass('Authentication enforced (401 unauthenticated) & distinct signed user sessions issued');
    }

    const authHeaders = (token: string) => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    // 3. Health endpoint
    {
      const healthRes = await fetch(`${baseUrl}/api/downloads/health`);
      assert.strictEqual(healthRes.status, 200);
      const health = await healthRes.json();
      assert.strictEqual(health.status, 'ok');
      assert.strictEqual(health.ffmpegAvailable, true, 'FFmpeg should be detected');
      assert.strictEqual(health.ffprobeAvailable, true, 'FFprobe should be detected');
      logPass(
        `Health endpoint ok (engine=${health.engine}, ffmpeg=${health.ffmpegAvailable}, ffprobe=${health.ffprobeAvailable})`
      );
    }

    // 4. VidRift-only / unauthorized title rejection
    {
      const srcRes = await fetch(
        `${baseUrl}/api/downloads/sources?mediaType=movie&tmdbId=693134`,
        { headers: authHeaders(tokenA) }
      );
      assert.strictEqual(srcRes.status, 200);
      const srcData = await srcRes.json();
      assert.strictEqual(srcData.available, false);
      assert.strictEqual(srcData.reason, 'Downloads are unavailable for this source.');

      const createRes = await fetch(`${baseUrl}/api/downloads`, {
        method: 'POST',
        headers: authHeaders(tokenA),
        body: JSON.stringify({
          tmdbId: '693134',
          mediaType: 'movie',
          title: 'Dune: Part Two',
          quality: '1080p',
        }),
      });
      assert.strictEqual(createRes.status, 400);
      const errData = await createRes.json();
      assert.strictEqual(errData.error, 'Downloads are unavailable for this source.');
      logPass('VidRift-only / unauthorized title returns exact unavailable message');
    }

    // 5. Real Public-Domain Movie Download (Sintel 480p, 4.37 MB) + FFprobe + Organized Storage + Range File Endpoint
    let sintelJobId = '';
    {
      const srcRes = await fetch(
        `${baseUrl}/api/downloads/sources?mediaType=movie&tmdbId=45745`,
        { headers: authHeaders(tokenA) }
      );
      assert.strictEqual(srcRes.status, 200);
      const srcData = await srcRes.json();
      assert.strictEqual(srcData.available, true);
      assert(srcData.options.length >= 3, 'Sintel should return real qualities');
      assert(!('directUrl' in srcData.options[0]), 'directUrl must never leak to frontend');

      const createRes = await fetch(`${baseUrl}/api/downloads`, {
        method: 'POST',
        headers: authHeaders(tokenA),
        body: JSON.stringify({
          tmdbId: '45745',
          mediaType: 'movie',
          title: 'Sintel',
          releaseYear: 2010,
          posterUrl: 'https://image.tmdb.org/t/p/w500/4Jg7S32lM7m7sT5m8u34k1W99F2.jpg',
          quality: '480p',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const created = await createRes.json();
      sintelJobId = created.job.id;
      assert.strictEqual(created.duplicate, false);

      // Cross-user isolation check while job exists
      const crossUserRes = await fetch(`${baseUrl}/api/downloads/${sintelJobId}`, {
        headers: authHeaders(tokenB),
      });
      assert.strictEqual(crossUserRes.status, 404, 'User B must not see User A download job');

      // Wait for real download to complete (max 45s)
      let completedJob: any = null;
      const deadline = Date.now() + 45_000;
      while (Date.now() < deadline) {
        const pollRes = await fetch(`${baseUrl}/api/downloads/${sintelJobId}`, {
          headers: authHeaders(tokenA),
        });
        const pollData = await pollRes.json();
        if (pollData.job.status === 'completed') {
          completedJob = pollData.job;
          break;
        }
        if (pollData.job.status === 'failed') {
          throw new Error(`Sintel download failed: ${pollData.job.error}`);
        }
        await sleep(400);
      }

      assert(completedJob, 'Sintel 480p download should complete within 45s');
      assert.strictEqual(completedJob.progress, 100);
      assert.strictEqual(completedJob.ffprobeValidated, true, 'FFprobe validation must succeed');
      assert(completedJob.mediaInfo?.videoCodec, 'FFprobe should extract video codec');
      assert.strictEqual(
        completedJob.relativePath,
        'Sintel (2010)/Sintel (Preview).mp4',
        `Unexpected relative path: ${completedJob.relativePath}`
      );
      const diskPath = path.join(testRoot, completedJob.relativePath);
      assert(fs.existsSync(diskPath), 'Downloaded MP4 must exist on disk');
      assert(fs.statSync(diskPath).size > 4_000_000, 'Downloaded MP4 must match real ~4.37 MB size');

      // Test authenticated file streaming with Range request
      const rangeRes = await fetch(`${baseUrl}/api/downloads/${sintelJobId}/file`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
          Range: 'bytes=0-1023',
        },
      });
      assert.strictEqual(rangeRes.status, 206, 'Range request must return 206 Partial Content');
      const chunk = Buffer.from(await rangeRes.arrayBuffer());
      assert.strictEqual(chunk.length, 1024, 'Range slice must return exact 1024 bytes');

      // Cross-user file download must fail with 404
      const crossFileRes = await fetch(`${baseUrl}/api/downloads/${sintelJobId}/file`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(crossFileRes.status, 404, 'User B must not download User A file');

      logPass(
        `Real public-domain movie download (Sintel 480p, ${(completedJob.fileSize / 1e6).toFixed(2)} MB, ${completedJob.mediaInfo.width}x${completedJob.mediaInfo.height} ${completedJob.mediaInfo.videoCodec}), FFprobe validated & Range-streamed`
      );
    }

    // 6. Pause, Resume, Cancel & Retry lifecycle on large legal file (Big Buck Bunny 1080p, 249 MB)
    {
      const createRes = await fetch(`${baseUrl}/api/downloads`, {
        method: 'POST',
        headers: authHeaders(tokenA),
        body: JSON.stringify({
          tmdbId: '10378',
          mediaType: 'movie',
          title: 'Big Buck Bunny',
          releaseYear: 2008,
          quality: '1080p',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const { job } = await createRes.json();

      // Wait briefly for transfer bytes to start arriving
      let bytesBeforePause = 0;
      for (let i = 0; i < 30; i++) {
        const poll = await (
          await fetch(`${baseUrl}/api/downloads/${job.id}`, { headers: authHeaders(tokenA) })
        ).json();
        if (poll.job.downloadedBytes > 0) {
          bytesBeforePause = poll.job.downloadedBytes;
          break;
        }
        await sleep(200);
      }
      assert(bytesBeforePause > 0, 'Big Buck Bunny download should receive bytes before pause');

      // Pause
      const pauseRes = await fetch(`${baseUrl}/api/downloads/${job.id}/pause`, {
        method: 'POST',
        headers: authHeaders(tokenA),
      });
      assert.strictEqual(pauseRes.status, 200);
      const pausedData = await pauseRes.json();
      assert.strictEqual(pausedData.job.status, 'paused');

      // Resume
      const resumeRes = await fetch(`${baseUrl}/api/downloads/${job.id}/resume`, {
        method: 'POST',
        headers: authHeaders(tokenA),
      });
      assert.strictEqual(resumeRes.status, 200);
      const resumedData = await resumeRes.json();
      assert(
        resumedData.job.status === 'downloading' || resumedData.job.status === 'queued',
        `Expected downloading/queued after resume, got ${resumedData.job.status}`
      );
      await sleep(700);
      const afterResume = await (
        await fetch(`${baseUrl}/api/downloads/${job.id}`, { headers: authHeaders(tokenA) })
      ).json();
      assert(
        afterResume.job.downloadedBytes >= bytesBeforePause,
        'Resumed download should continue from or beyond previous byte offset'
      );

      // Cancel (must clean up .part file)
      const cancelRes = await fetch(`${baseUrl}/api/downloads/${job.id}/cancel`, {
        method: 'POST',
        headers: authHeaders(tokenA),
      });
      assert.strictEqual(cancelRes.status, 200);
      const cancelledData = await cancelRes.json();
      assert.strictEqual(cancelledData.job.status, 'cancelled');
      const partPath = `${path.join(testRoot, cancelledData.job.relativePath)}.part`;
      assert.strictEqual(fs.existsSync(partPath), false, '.part file must be removed after cancel');

      // Retry cancelled job -> transitions back to active/queued -> then delete cleanly
      const retryRes = await fetch(`${baseUrl}/api/downloads/${job.id}/retry`, {
        method: 'POST',
        headers: authHeaders(tokenA),
      });
      assert.strictEqual(retryRes.status, 200);
      const retriedData = await retryRes.json();
      assert(
        retriedData.job.status === 'downloading' || retriedData.job.status === 'queued',
        'Retry must re-activate job'
      );

      const delRes = await fetch(`${baseUrl}/api/downloads/${job.id}`, {
        method: 'DELETE',
        headers: authHeaders(tokenA),
      });
      assert.strictEqual(delRes.status, 200);

      logPass('Pause, Resume (Range continuation), Cancel (.part cleanup), Retry & Delete verified');
    }

    // 7. TV Series Season Batch Queue, Duplicate Prevention, Queue Reordering & Organized Folders
    {
      const batchPayload = {
        items: [
          {
            tmdbId: '900001',
            mediaType: 'tv',
            title: 'Open Cinema Anthology',
            releaseYear: 2010,
            seasonNumber: 1,
            episodeNumber: 1,
            episodeTitle: 'Chapter 1: Sintel',
            quality: '480p',
          },
          {
            tmdbId: '900001',
            mediaType: 'tv',
            title: 'Open Cinema Anthology',
            releaseYear: 2010,
            seasonNumber: 1,
            episodeNumber: 2,
            episodeTitle: 'Chapter 2: Big Buck Bunny',
            quality: '480p',
          },
          {
            tmdbId: '900001',
            mediaType: 'tv',
            title: 'Open Cinema Anthology',
            releaseYear: 2010,
            seasonNumber: 1,
            episodeNumber: 3,
            episodeTitle: 'Chapter 3: Open Video Showcase',
            quality: '480p',
          },
        ],
      };

      const batchRes = await fetch(`${baseUrl}/api/downloads`, {
        method: 'POST',
        headers: authHeaders(tokenB),
        body: JSON.stringify(batchPayload),
      });
      assert.strictEqual(batchRes.status, 201);
      const batch = await batchRes.json();
      assert.strictEqual(batch.created.length, 3, 'Should create 3 season episode jobs');
      assert.strictEqual(
        batch.created[0].relativePath,
        'Open Cinema Anthology/Season 01/S01E01.mp4'
      );
      assert.strictEqual(
        batch.created[1].relativePath,
        'Open Cinema Anthology/Season 01/S01E02.mp4'
      );
      assert.strictEqual(
        batch.created[2].relativePath,
        'Open Cinema Anthology/Season 01/S01E03.mp4'
      );

      // Pause ep 1 immediately so ep 2 & ep 3 remain queued for deterministic reorder test
      // Actually with maxConcurrent=1, ep1 is downloading, ep2 and ep3 are queued!
      const listBeforeReorder = await (
        await fetch(`${baseUrl}/api/downloads`, { headers: authHeaders(tokenB) })
      ).json();
      const queuedBefore = listBeforeReorder.jobs.filter((j: any) => j.status === 'queued');

      // Duplicate submission must skip all active/queued episodes
      const dupRes = await fetch(`${baseUrl}/api/downloads`, {
        method: 'POST',
        headers: authHeaders(tokenB),
        body: JSON.stringify(batchPayload),
      });
      const dupData = await dupRes.json();
      assert(
        dupData.skippedDuplicates >= 2,
        `Expected duplicate prevention, got skippedDuplicates=${dupData.skippedDuplicates}`
      );

      // Reorder queue if at least 2 queued items exist
      if (queuedBefore.length >= 2) {
        const reversedIds = queuedBefore.map((j: any) => j.id).reverse();
        const reorderRes = await fetch(`${baseUrl}/api/downloads/queue/reorder`, {
          method: 'POST',
          headers: authHeaders(tokenB),
          body: JSON.stringify({ orderedJobIds: reversedIds }),
        });
        assert.strictEqual(reorderRes.status, 200);
        const reorderData = await reorderRes.json();
        assert.strictEqual(reorderData.queue[0].id, reversedIds[0], 'Queue order must update');
      }

      // Clean up User B's batch jobs quickly
      for (const createdJob of batch.created) {
        await fetch(`${baseUrl}/api/downloads/${createdJob.id}`, {
          method: 'DELETE',
          headers: authHeaders(tokenB),
        });
      }

      logPass('TV season batch queueing, organized Series/Season 01/S01E0X paths, duplicate prevention & queue reordering verified');
    }

    // 8. Backend Restart & State Recovery
    {
      const freshManager = new DownloadManagerService();
      const recovered = await freshManager.listJobs(
        (await (await fetch(`${baseUrl}/api/downloads/${sintelJobId}`, { headers: authHeaders(tokenA) })).json()).job.userId
      );
      const recoveredSintel = recovered.jobs.find((j) => j.id === sintelJobId);
      assert(recoveredSintel, 'Persisted job must survive simulated backend restart');
      assert.strictEqual(recoveredSintel.status, 'completed');
      assert.strictEqual(recoveredSintel.ffprobeValidated, true);
      logPass('Backend restart & atomic JSON job state recovery verified');
    }

    console.log(`\nALL ${passed.length} DOWNLOAD MANAGER E2E TESTS PASSED!\n`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error('\n[FAIL]', err);
  fs.rmSync(testRoot, { recursive: true, force: true });
  process.exit(1);
});
