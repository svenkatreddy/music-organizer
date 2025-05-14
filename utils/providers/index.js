const { fetchFromMusicBrainz } = require('./musicbrainz');
const { fetchFromLastFM } = require('./lastfm');
const { fetchFromSpotify } = require('./spotify');

function mergeMeta(primary, fallback) {
  return Object.fromEntries(
    Object.keys({ ...primary, ...fallback }).map(key => [
      key,
      primary[key] || fallback[key] || ''
    ])
  );
}

async function fetchFromProviders(query, options) {
  try {
    const mb = await fetchFromMusicBrainz(query);
    if (mb && mb.title && mb.artist) return mb;
  } catch {}

  try {
    const sp = await fetchFromSpotify(query, options.spotifyClientId, options.spotifyClientSecret);
    if (sp && sp.title && sp.artist) return sp;
  } catch {}

  try {
    const lf = await fetchFromLastFM(query, options.lastfmKey);
    return lf;
  } catch {
    return {};
  }
}

module.exports = { fetchFromProviders };
