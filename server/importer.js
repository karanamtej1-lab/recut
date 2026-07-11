// Imports a real Instagram/TikTok video by URL: downloads it (yt-dlp),
// extracts its audio, and detects the real scene cuts so the app can show
// the actual edit structure for the user to remix.
//
// NOTE: downloads other creators' content. Intended for personal remixing.
// Redistributing the original video/audio may infringe copyright + platform ToS.

const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function execp(cmd, args, label) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 64 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`[${label}] ${err.message}: ${String(stderr).slice(0, 400)}`));
      else resolve(stdout);
    });
  });
}

function detectPlatform(url) {
  if (/instagram\.com|instagr\.am/.test(url)) return 'instagram';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  return 'unknown';
}

// Download the video + grab metadata in one shot.
async function downloadVideo(url, workDir) {
  const videoPath = path.join(workDir, 'source.mp4');
  await execp('yt-dlp', [
    '--no-warnings', '--socket-timeout', '30',
    '-f', 'mp4/best',
    '--merge-output-format', 'mp4',
    '-o', videoPath,
    url,
  ], 'download');

  const metaJson = await execp('yt-dlp', [
    '--no-warnings', '--skip-download', '--dump-json', url,
  ], 'meta');
  const m = JSON.parse(metaJson);
  return {
    videoPath,
    title: m.title || 'Imported video',
    uploader: m.uploader || m.uploader_id || 'unknown',
    duration: m.duration || 0,
  };
}

async function extractAudio(videoPath, outPath) {
  await execp('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', videoPath, '-vn', '-c:a', 'aac', outPath,
  ], 'audio');
  return outPath;
}

// Probe true duration if metadata didn't give one.
async function probeDuration(videoPath) {
  const out = await execp('ffprobe', [
    '-v', 'quiet', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', videoPath,
  ], 'probe');
  return parseFloat(out.trim()) || 0;
}

// Detect real scene cuts → clip slots [{startTime,endTime,duration}].
async function detectScenes(videoPath, totalDuration) {
  const out = await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', [
      '-hide_banner', '-i', videoPath,
      '-filter:v', "select='gt(scene,0.3)',showinfo",
      '-f', 'null', '-',
    ]);
    let err = '';
    p.stderr.on('data', d => err += d.toString());
    p.on('close', () => resolve(err));
    p.on('error', reject);
  });

  const cuts = [...out.matchAll(/pts_time:([0-9.]+)/g)]
    .map(m => parseFloat(m[1]))
    .filter(t => t > 0.3 && t < totalDuration - 0.3);

  // Build boundaries from 0 → cuts → end.
  const bounds = [0, ...cuts, totalDuration];
  const clips = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i], end = bounds[i + 1];
    if (end - start < 0.4) continue; // skip micro-segments
    clips.push({
      id: `clip_${clips.length}`,
      startTime: parseFloat(start.toFixed(2)),
      endTime: parseFloat(end.toFixed(2)),
      duration: parseFloat((end - start).toFixed(2)),
    });
  }
  // Fallback: if no scenes detected, even ~2.5s splits.
  if (clips.length === 0) {
    const n = Math.max(1, Math.round(totalDuration / 2.5));
    for (let i = 0; i < n; i++) {
      const start = (totalDuration / n) * i, end = (totalDuration / n) * (i + 1);
      clips.push({
        id: `clip_${i}`,
        startTime: parseFloat(start.toFixed(2)),
        endTime: parseFloat(end.toFixed(2)),
        duration: parseFloat((end - start).toFixed(2)),
      });
    }
  }
  return clips;
}

/**
 * Full import. Returns everything the app needs to build a project.
 * @param {string} url
 * @param {string} workDir
 * @param {string} publicPrefix  e.g. "/output/job_x" for building URLs
 */
async function importFromUrl(url, workDir, publicPrefix) {
  const platform = detectPlatform(url);
  const meta = await downloadVideo(url, workDir);
  const duration = meta.duration || await probeDuration(meta.videoPath);

  const audioPath = path.join(workDir, 'audio.m4a');
  await extractAudio(meta.videoPath, audioPath);

  const clips = await detectScenes(meta.videoPath, duration);

  return {
    platform,
    title: meta.title,
    uploader: meta.uploader,
    duration,
    clips,
    videoUrl: `${publicPrefix}/source.mp4`,
    audioUrl: `${publicPrefix}/audio.m4a`,
  };
}

module.exports = { importFromUrl, detectPlatform, detectScenes, downloadVideo, extractAudio };
