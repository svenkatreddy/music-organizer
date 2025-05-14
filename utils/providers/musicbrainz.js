const MusicBrainzApi = require('musicbrainz-api');
const axios = require('axios');

const mbApi = new MusicBrainzApi({
  appName: 'MusicOrganizerCLI',
  appVersion: '1.0.0',
  appContactInfo: 'email@example.com'
});

async function fetchFromMusicBrainz(query) {
  try {
    const search = await mbApi.searchRecordings(query, { limit: 1 });
    const rec = search.recordings?.[0];
    if (!rec) return {};

    const recording = await mbApi.getRecordingById(rec.id, { inc: ['genres', 'releases'] });
    const release = recording.releases?.[0];

    let picture = '';
    if (release?.id) {
      try {
        const coverRes = await axios.get(`https://coverartarchive.org/release/${release.id}`, { timeout: 3000 });
        picture = coverRes.data.images?.[0]?.thumbnails?.large || '';
      } catch {
        picture = '';
      }
    }

    return {
      title: recording.title,
      artist: recording['artist-credit']?.[0]?.artist?.name,
      album: release?.title || '',
      year: release?.date?.split('-')[0] || '',
      genre: recording.genres?.[0]?.name || '',
      track: '', // not exposed directly
      disc: '', // not exposed directly
      picture
    };
  } catch (err) {
    console.error('[MusicBrainz Error]', err.message);
    throw err; // ensure fallback to Spotify
  }
}

module.exports = { fetchFromMusicBrainz };
