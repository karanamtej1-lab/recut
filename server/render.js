// Real FFmpeg render pipeline.
// Takes user clips + a template spec and produces one finished vertical MP4
// with the clips trimmed/normalized, concatenated, viral audio mixed in,
// and (optional) captions burned on as image overlays.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const W = 1080;
const H = 1920;
const FPS = 30;

function run(args, label) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`[${label}] ffmpeg exited ${code}: ${err.slice(0, 800)}`));
    });
  });
}

// Normalize one clip → 1080x1920, 30fps, exact target duration, fill+crop.
async function normalizeClip(srcPath, duration, outPath) {
  const vf = [
    `scale=${W}:${H}:force_original_aspect_ratio=increase`,
    `crop=${W}:${H}`,
    `setsar=1`,
    `fps=${FPS}`,
  ].join(',');
  await run([
    '-t', String(duration),
    '-i', srcPath,
    '-vf', vf,
    '-an',                     // drop original clip audio (template audio added later)
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    outPath,
  ], 'normalize');
}

// Overlay a caption PNG (full-frame, transparent) onto a clip.
async function overlayCaption(videoPath, pngPath, outPath) {
  await run([
    '-i', videoPath,
    '-i', pngPath,
    '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto[v]',
    '-map', '[v]',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    outPath,
  ], 'caption');
}

// Concatenate normalized segments (all share codec/params → fast copy concat).
async function concatSegments(segPaths, outPath) {
  const listFile = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
  fs.writeFileSync(listFile, segPaths.map(p => `file '${p}'`).join('\n'));
  await run([
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    outPath,
  ], 'concat');
  fs.unlinkSync(listFile);
}

// Mix the template's audio track over the silent concatenated video,
// trimmed to whichever is shorter (the video).
async function addAudio(videoPath, audioPath, outPath) {
  await run([
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    outPath,
  ], 'audio');
}

/**
 * @param {Object} spec
 * @param {Array<{path:string, duration:number, captionPng?:string}>} spec.clips
 * @param {string} [spec.audioPath]
 * @param {string} spec.workDir
 * @param {string} spec.outPath
 */
async function render(spec) {
  const { clips, audioPath, workDir, outPath } = spec;
  if (!clips || clips.length === 0) throw new Error('No clips provided');

  const segments = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    let seg = path.join(workDir, `seg_${i}.mp4`);
    await normalizeClip(clip.path, clip.duration, seg);

    if (clip.captionPng && fs.existsSync(clip.captionPng)) {
      const captioned = path.join(workDir, `seg_${i}_cap.mp4`);
      await overlayCaption(seg, clip.captionPng, captioned);
      seg = captioned;
    }
    segments.push(seg);
  }

  const silentConcat = path.join(workDir, 'concat.mp4');
  await concatSegments(segments, silentConcat);

  if (audioPath && fs.existsSync(audioPath)) {
    await addAudio(silentConcat, audioPath, outPath);
  } else {
    fs.copyFileSync(silentConcat, outPath);
  }
  return outPath;
}

module.exports = { render, normalizeClip, concatSegments, addAudio, W, H, FPS };
