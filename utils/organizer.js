const fs = require('fs-extra');
const path = require('path');
const mm = require('music-metadata');
const NodeID3 = require('node-id3');
const crypto = require('crypto');
const pLimit = require('p-limit');
const { fetchFromProviders } = require('./providers');

function sanitize(name) {
  return name ? name.replace(/[^a-z0-9 \-_]/gi, '').trim() : 'Unknown';
}

function applyFormat(format, tags, originalName) {
  return format.replace(/{(\w+)}/g, (_, key) => {
    if (key === 'original') return sanitize(originalName);
    return sanitize(tags[key] || 'Unknown');
  });
}

async function organizeDirectory(inputDir, outputDir, options) {
  const trackingFile = path.join(inputDir, '.music-organizer-tracking.json');
  const tracking = fs.existsSync(trackingFile) ? await fs.readJson(trackingFile) : {};
  const entries = await fs.readdir(inputDir, { withFileTypes: true });

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(inputDir, entry.name);
    if (entry.isFile() && ['.mp3', '.flac'].includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      const subfiles = fs.readdirSync(fullPath).map(name => path.join(fullPath, name));
      subfiles.forEach(f => {
        if (['.mp3', '.flac'].includes(path.extname(f).toLowerCase())) {
          files.push(f);
        }
      });
    }
  }

  const limit = pLimit(options.concurrency);
  const results = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const originalName = path.parse(fileName).name;

    const hash = crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
    if (tracking[hash]) continue;

    results.push(limit(async () => {
      const localMeta = await mm.parseFile(filePath).then(meta => meta.common).catch(() => ({}));
      const fallbackMeta = await fetchFromProviders(originalName, options);

      const tags = {
        title: localMeta.title || fallbackMeta.title || 'Unknown Title',
        artist: localMeta.artist || fallbackMeta.artist || 'Unknown Artist',
        album: localMeta.album || fallbackMeta.album || 'Unknown Album',
        year: localMeta.year || fallbackMeta.year || '',
        genre: (localMeta.genre && localMeta.genre[0]) || fallbackMeta.genre || '',
        track: (localMeta.track && localMeta.track.no?.toString()) || fallbackMeta.track || '',
        disc: (localMeta.disk && localMeta.disk.no?.toString()) || fallbackMeta.disc || ''
      };

      const relPath = applyFormat(options.format, tags, originalName) + ext;
      const destPath = path.join(outputDir, relPath);

      if (!options.dryRun) {
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(filePath, destPath);
        NodeID3.update(tags, destPath);
        if (options.embedArt && fallbackMeta.picture) {
          NodeID3.update({ image: fallbackMeta.picture }, destPath);
        }
        tracking[hash] = true;
      }
    }));
  }

  await Promise.all(results);
  if (!options.dryRun) await fs.writeJson(trackingFile, tracking);
}

module.exports = { organizeDirectory, sanitize, applyFormat };
