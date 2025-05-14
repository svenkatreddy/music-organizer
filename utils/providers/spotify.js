const SpotifyWebApi = require('spotify-web-api-node');

async function fetchFromSpotify(query, clientId, clientSecret) {
  const spotify = new SpotifyWebApi({ clientId, clientSecret });

  try {
    const token = await spotify.clientCredentialsGrant();
    spotify.setAccessToken(token.body.access_token);
    const result = await spotify.searchTracks(query, { limit: 1 });
    const track = result.body.tracks.items[0];

    return track ? {
      title: track.name,
      artist: track.artists?.[0]?.name,
      album: track.album?.name,
      year: track.album?.release_date?.split('-')[0] || '',
      genre: '',  // Spotify doesn’t expose this for individual tracks
      track: track.track_number?.toString() || '',
      disc: track.disc_number?.toString() || '',
      picture: track.album?.images?.[0]?.url || ''
    } : {};
  } catch {
    return {};
  }
}

module.exports = { fetchFromSpotify };
