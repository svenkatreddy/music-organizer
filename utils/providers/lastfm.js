const axios = require('axios');

async function fetchFromLastFM(query, apiKey) {
  try {
    const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'track.search',
        track: query,
        api_key: apiKey,
        format: 'json',
        limit: 1
      }
    });

    const track = response.data.results?.trackmatches?.track?.[0];
    return track ? {
      title: track.name,
      artist: track.artist,
      album: '',
      year: '',
      genre: '',
      track: '',
      disc: '',
      picture: track.image?.slice(-1)?.['#text'] || ''
    } : {};
  } catch {
    return {};
  }
}

module.exports = { fetchFromLastFM };
