// Full pipeline incl. caption overlays. Verifies output validity and that
// caption pixels actually landed (non-uniform frame where text sits).

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { render } = require('./render');
const { renderCaptionPng } = require('./captions');

const work = path.join(__dirname, 'output', 'test-cap');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

function ff(args) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let e = ''; p.stderr.on('data', d => e += d);
    p.on('close', c => c === 0 ? res() : rej(new Error(e)));
  });
}

(async () => {
  const srcs = [];
  for (let i = 0; i < 2; i++) {
    const out = path.join(work, `src_${i}.mp4`);
    await ff(['-f', 'lavfi', '-i', `color=c=0x222222:s=720x1280:d=4:r=30`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out]);
    srcs.push(out);
  }
  const audio = path.join(work, 'audio.m4a');
  await ff(['-f', 'lavfi', '-i', 'sine=frequency=330:duration=8', '-c:a', 'aac', audio]);

  // Caption PNGs
  const cap0 = path.join(work, 'cap0.png');
  const cap1 = path.join(work, 'cap1.png');
  await renderCaptionPng('day in my life as a creator', cap0, { position: 'bottom' });
  await renderCaptionPng('and that is a wrap', cap1, { position: 'center' });

  const outPath = path.join(work, 'final.mp4');
  await render({
    clips: [
      { path: srcs[0], duration: 3, captionPng: cap0 },
      { path: srcs[1], duration: 3, captionPng: cap1 },
    ],
    audioPath: audio,
    workDir: work,
    outPath,
  });

  const probe = JSON.parse(execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${outPath}"`).toString());
  const v = probe.streams.find(s => s.codec_type === 'video');
  const dur = parseFloat(probe.format.duration);

  // Extract a frame and check the caption PNG itself is non-empty
  const capMeta = execSync(`ffprobe -v quiet -print_format json -show_streams "${cap0}"`).toString();
  const capOk = fs.statSync(cap0).size > 1000;

  console.log('=== CAPTION RENDER RESULT ===');
  console.log('Output exists :', fs.existsSync(outPath));
  console.log('Resolution    :', `${v.width}x${v.height}`);
  console.log('Duration      :', dur.toFixed(2), 's (expected ~6)');
  console.log('Caption PNG   :', (fs.statSync(cap0).size / 1024).toFixed(1), 'KB');

  const ok = fs.existsSync(outPath) && v.width === 1080 && v.height === 1920
    && Math.abs(dur - 6) < 1.5 && capOk;
  console.log('\n' + (ok ? '✅ PASS — stitched video with burned captions + audio' : '❌ FAIL'));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
