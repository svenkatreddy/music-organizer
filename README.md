# Music Organizer CLI

Organize your `.mp3` and `.flac` files into folders using metadata from file tags, then fallback to metadata from MusicBrainz based on file name, Spotify, and Last.fm.

# Suggested file names
filename: `Artist - Track`

## Features

- Smart fallback metadata retrieval:
  - ✅ MusicBrainz (full metadata)
  - 🔄 Spotify (fallback if MB fails)
  - 🟡 Last.fm (as third backup)
- Album art embedding
- Dry-run mode
- Format string output structure
- Concurrent file processing
- Resume support via checksum
- Mocha test cases

## Installation

```bash
npm install
npm link
```

## Usage

```bash
music-organizer organize ./input ./output \
  --spotifyClientId <ID> \
  --spotifyClientSecret <SECRET> \
  --dryRun \
  --embedArt \
  --concurrency 4 \
  --rateLimit 5 \
  --format "{artist}/{album}/{title}"
```

## Supported Format Tokens

- `{artist}`, `{album}`, `{title}`, `{track}`, `{year}`, `{genre}`, `{disc}`, `{original}`

## License

MIT
