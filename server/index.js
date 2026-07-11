// Recut render server. The mobile app uploads the user's clips + a template
// spec; this stitches them into one finished vertical reel and returns it.

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { render } = require('./render');
const { renderCaptionPng } = require('./captions');
const { importFromUrl } = require('./importer');

const app = express();
const PORT = process.env.PORT || 4000;

const upload = multer({ dest: path.join(__dirname, 'uploads') });
app.use(cors());
app.use(express.json());
app.use('/output', express.static(path.join(__dirname, 'output')));

app.get('/health', (_req, res) => res.json({ ok: true, ffmpeg: true }));

/**
 * POST /import  { url }
 * Downloads a real IG/TikTok video, extracts its audio, detects scene cuts.
 * Returns the structure the app turns into a remixable project.
 */
app.post('/import', async (req, res) => {
  const url = (req.body && req.body.url || '').trim();
  if (!url) return res.status(400).json({ error: 'No url provided' });

  const jobId = `import_${Date.now()}`;
  const work = path.join(__dirname, 'output', jobId);
  fs.mkdirSync(work, { recursive: true });
  try {
    const result = await importFromUrl(url, work, `/output/${jobId}`);
    res.json(result);
  } catch (e) {
    console.error('Import failed:', e.message);
    const msg = /login|cookies|private|unavailable/i.test(e.message)
      ? 'This video needs login or is private. Try a public TikTok/Reel link.'
      : e.message;
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /render  (multipart/form-data)
 *  - clips: video files (one per template slot, in order)
 *  - audio: optional audio/video file for the soundtrack
 *  - spec:  JSON string { durations:number[], captions:string[], captionsOn:bool }
 * Returns: { url } pointing to the finished mp4.
 */
app.post('/render', upload.fields([{ name: 'clips' }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
  const jobId = `job_${Date.now()}`;
  const work = path.join(__dirname, 'output', jobId);
  fs.mkdirSync(work, { recursive: true });

  try {
    const spec = JSON.parse(req.body.spec || '{}');
    const clipFiles = (req.files.clips || []);
    if (clipFiles.length === 0) return res.status(400).json({ error: 'No clips uploaded' });

    const durations = spec.durations || clipFiles.map(() => 2.5);
    const captions = spec.captions || [];
    const captionsOn = spec.captionsOn !== false;

    const clips = [];
    for (let i = 0; i < clipFiles.length; i++) {
      const clip = { path: clipFiles[i].path, duration: durations[i] || 2.5 };
      if (captionsOn && captions[i]) {
        const png = path.join(work, `cap_${i}.png`);
        await renderCaptionPng(captions[i], png, { position: i === 0 ? 'bottom' : 'bottom' });
        clip.captionPng = png;
      }
      clips.push(clip);
    }

    const audioPath = req.files.audio && req.files.audio[0] ? req.files.audio[0].path : null;
    const outPath = path.join(work, 'reel.mp4');
    await render({ clips, audioPath, workDir: work, outPath });

    // Clean up raw uploads (keep the finished reel)
    [...clipFiles, ...(req.files.audio || [])].forEach(f => {
      try { fs.unlinkSync(f.path); } catch {}
    });

    res.json({ url: `/output/${jobId}/reel.mp4`, jobId });
  } catch (e) {
    console.error('Render failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Recut render server on http://localhost:${PORT}`));
