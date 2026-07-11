// Render caption text to a transparent full-frame PNG (1080x1920) that can be
// overlaid on a clip. Used because this ffmpeg build has no drawtext filter.

const sharp = require('sharp');
const { W, H } = require('./render');

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

// Word-wrap into lines of <= maxChars (rough, monospace-ish estimate).
function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {string} text caption text
 * @param {string} outPath png path
 * @param {Object} [opts]
 * @param {number} [opts.fontSize=64]
 * @param {string} [opts.position='bottom'] 'bottom' | 'center' | 'top'
 */
async function renderCaptionPng(text, outPath, opts = {}) {
  const fontSize = opts.fontSize || 64;
  const position = opts.position || 'bottom';
  const lines = wrap(text.toUpperCase(), 18);
  const lineH = fontSize * 1.25;
  const blockH = lines.length * lineH;

  let startY;
  if (position === 'top') startY = H * 0.18;
  else if (position === 'center') startY = (H - blockH) / 2 + fontSize;
  else startY = H * 0.78 - blockH; // bottom (above caption-safe area)

  const tspans = lines.map((ln, i) => {
    const y = startY + i * lineH;
    return `<text x="${W / 2}" y="${y}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
      font-weight="900" fill="#ffffff"
      stroke="#000000" stroke-width="${fontSize * 0.09}"
      paint-order="stroke" style="letter-spacing:1px">${escapeXml(ln)}</text>`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${tspans}
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outPath);
  return outPath;
}

module.exports = { renderCaptionPng };
