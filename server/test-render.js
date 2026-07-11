// Generates real sample clips + audio, runs the render pipeline,
// and verifies the output is a valid, correctly-sized, correctly-long MP4.

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { render } = require('./render');

const work = path.join(__dirname, 'output', 'test');
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
  // 3 distinct source clips, each 5s, different sizes/colors + moving box so it's real video
  const colors = ['red', 'green', 'blue'];
  const sizes = ['640x480', '720x1280', '1280x720'];
  const srcs = [];
  for (let i = 0; i < 3; i++) {
    const out = path.join(work, `src_${i}.mp4`);
    await ff([
      '-f', 'lavfi', '-i', `color=c=${colors[i]}:s=${sizes[i]}:d=5:r=30`,
      '-vf', `drawbox=x='t*100':y=100:w=80:h=80:color=white:t=fill`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out,
    ]);
    srcs.push(out);
  }

  // A real audio track (10s tone)
  const audio = path.join(work, 'audio.m4a');
  await ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=10', '-c:a', 'aac', audio]);

  // Run the pipeline: trim each to 2.5s, add audio
  const outPath = path.join(work, 'final.mp4');
  await render({
    clips: [
      { path: srcs[0], duration: 2.5 },
      { path: srcs[1], duration: 2.5 },
      { path: srcs[2], duration: 2.5 },
    ],
    audioPath: audio,
    workDir: work,
    outPath,
  });

  // Verify with ffprobe
  const probe = JSON.parse(execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${outPath}"`,
  ).toString());
  const v = probe.streams.find(s => s.codec_type === 'video');
  const a = probe.streams.find(s => s.codec_type === 'audio');
  const dur = parseFloat(probe.format.duration);

  console.log('=== RENDER RESULT ===');
  console.log('File exists   :', fs.existsSync(outPath));
  console.log('Size          :', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
  console.log('Resolution    :', v ? `${v.width}x${v.height}` : 'NONE');
  console.log('Duration      :', dur.toFixed(2), 's (expected ~7.5)');
  console.log('Video codec   :', v && v.codec_name);
  console.log('Audio codec   :', a ? a.codec_name : 'NONE');

  const ok = fs.existsSync(outPath) && v.width === 1080 && v.height === 1920
    && a && Math.abs(dur - 7.5) < 1.5;
  console.log('\n' + (ok ? '✅ PASS — real stitched vertical video with audio' : '❌ FAIL'));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
