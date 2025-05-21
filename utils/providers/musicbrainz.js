import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { MusicBrainzApi } = require('musicbrainz-api');
import axios from 'axios';
const debug =  require('debug')('music-organizer:musicbrainz');

const mbApi = new MusicBrainzApi({
  appName: 'MusicOrganizerCLI',
  appVersion: '1.0.0',
  appContactInfo: 'email@example.com'
});

export async function fetchFromMusicBrainz({ artist, title, original }) {
  try {
    const query = artist && title
      ? `recording:"${title}" AND artist:"${artist}"`
      : original;

    debug(`searching for ${query}`);  

    const search = await mbApi.search('recording', { query }, { limit: 3 });
    debug(`recording search results: `, search);

    const rec = search.recordings?.[0];
    if (!rec) return {};

    const recording = await mbApi.lookup('recording', rec.id, ['genres', 'releases']);
    const release = recording.releases?.find(r => r.status === 'Official') || recording.releases?.[0];

    let picture = '';
    if (release?.id) {
      try {
        const coverRes = await axios.get(`https://coverartarchive.org/release/${release.id}`, { timeout: 3000 });
        picture = coverRes.data.images?.[0]?.thumbnails?.large || '';
        debug(picture);
      } catch {
        picture = '';
      }
    }

    let track = '';
    let disc = '';
    if (release?.id) {
      try {
        const releaseDetails = await mbApi.lookup('release', release.id, ['media']);
        const media = releaseDetails.media?.[0];
        const trackObj = media?.tracks?.find(t => t.recording?.id === rec.id);
        track = trackObj?.position?.toString() || '';
        disc = media?.position?.toString() || '';
      } catch {}
    }

    const artistCredit = recording['artist-credit'] || rec['artist-credit'];
    const artistName = artistCredit?.[0]?.artist?.name || '';

    return {
      title: recording.title || rec?.title || '',
      artist: artistName,
      album: release?.title || rec?.title || '',
      year: release?.date?.split('-')[0] || rec['first-release-date']?.split('-')[0] || '',
      genre: recording.genres?.[0]?.name || '',
      track,
      disc,
      picture
    };
  } catch (err) {
    console.error('[MusicBrainz Error]', err.message);
    throw err;
  }
}
