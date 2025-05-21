import { fetchFromMusicBrainz } from './musicbrainz.js';
import { fetchFromLastFM } from './lastfm.js';
import { fetchFromSpotify } from './spotify.js';

function mergeMeta(primary, fallback) {
  return Object.fromEntries(
    Object.keys({ ...primary, ...fallback }).map(key => [
      key,
      primary[key] || fallback[key] || ''
    ])
  );
}

export async function fetchFromProviders({ artist, title, original }, options) {
  try {
    const mb = await fetchFromMusicBrainz({ artist, title, original });
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
