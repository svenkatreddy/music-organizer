const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const mm = require('music-metadata');
const NodeID3 = require('node-id3');
const crypto = require('crypto');
const pLimit = require('p-limit');
const { fetchFromProviders } = require('./providers');
const debug = require('debug')('music-organizer:organizer');

function parseFilename(filename) {
  const name = filename.replace(/\.[^/.]+$/, ''); // remove extension
  const parts = name.split(' - ');
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim()
    };
  }
  return {
    artist: '',
    title: name.trim()
  };
}


function sanitize(name) {
  return name ? name.replace(/[^a-z0-9 \-_]/gi, '').trim() : 'Unknown';
}

function applyFormat(format, tags, originalName) {
  return format.replace(/{(\w+)}/g, (_, key) => {
    if (key === 'original') return sanitize(originalName);
    return sanitize(tags[key] || 'Unknown');
  });
}

async function getAllAudioFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllAudioFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && ['.mp3', '.flac'].includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function organizeDirectory(inputDir, outputDir, options) {
  const trackingFile = path.join(inputDir, '.music-organizer-tracking.json');
  const tracking = fs.existsSync(trackingFile) ? await fs.readJson(trackingFile) : {};
  const files = await getAllAudioFiles(inputDir);

  const limit = pLimit(options.concurrency);
  const results = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const originalName = path.parse(fileName).name;

    const hash = crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
    if (tracking[hash]) continue;

    results.push(limit(async () => {
      debug(`processing file: ${fileName}`);
      const localMeta = await mm.parseFile(filePath).then(meta => meta.common).catch(() => ({}));
      const { artist, title } = parseFilename(fileName);
      const fallbackMeta = await fetchFromProviders({ artist, title, original: originalName }, options);

      const tags = {
        title: localMeta.title || fallbackMeta.title || originalName || 'Unknown Title',
        artist: localMeta.artist || fallbackMeta.artist || 'Unknown Artist',
        album: localMeta.album || fallbackMeta.album || 'Unknown Album',
        year: localMeta.year || fallbackMeta.year || '',
        genre: (localMeta.genre && localMeta.genre[0]) || fallbackMeta.genre || '',
        track: (localMeta.track && localMeta.track.no?.toString()) || fallbackMeta.track || '',
        disc: (localMeta.disk && localMeta.disk.no?.toString()) || fallbackMeta.disc || '',
      };
      
      let imageTag = null;
      if (options.embedArt) {
        if (localMeta.picture?.[0]?.data) {
          debug('Using embedded album art from file');
          imageTag = {
            mime: localMeta.picture[0].format || 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'Cover',
            imageBuffer: localMeta.picture[0].data
          };
        } else if (fallbackMeta.picture) {
          try {
            const response = await axios.get(fallbackMeta.picture, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');
            const mimeType = response.headers['content-type'] || 'image/jpeg';
            debug('Downloaded album art from fallbackMeta.picture');
            imageTag = {
              mime: mimeType,
              type: { id: 3, name: 'front cover' },
              description: 'Cover',
              imageBuffer
            };
          } catch (err) {
            console.warn(`Failed to download album art for ${fileName}: ${err.message}`);
          }
        }
      }
      if (imageTag) {
        tags.image = imageTag;
      }

      const relPath = applyFormat(options.format, tags, originalName) + ext;
      const destPath = path.join(outputDir, relPath);

      debug(tags);
      debug(destPath);

      if (!options.dryRun) {
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(filePath, destPath);
        NodeID3.update(tags, destPath);
        tracking[hash] = true;
      }
    }));
  }

  await Promise.all(results);
  if (!options.dryRun) await fs.writeJson(trackingFile, tracking);
}

module.exports = { organizeDirectory, sanitize, applyFormat };
