const assert = require('assert');
const { sanitize, applyFormat } = require('../utils/organizer');

describe('sanitize()', () => {
  it('should remove special characters', () => {
    assert.strictEqual(sanitize('My/Song:Title*?'), 'MySongTitle');
  });

  it('should preserve valid characters', () => {
    assert.strictEqual(sanitize('Track 01 - Hello World'), 'Track 01 - Hello World');
  });
});

describe('applyFormat()', () => {
  const tags = {
    title: 'Track Title',
    artist: 'Test Artist',
    album: 'Test Album',
    track: '01',
    year: '2023',
    genre: 'Pop',
    disc: '1'
  };

  it('should generate correct formatted path', () => {
    const format = '{year}/{album}/{track} - {title}';
    assert.strictEqual(applyFormat(format, tags, 'original'), '2023/Test Album/01 - Track Title');
  });

  it('should handle unknown tokens gracefully', () => {
    const format = '{unknown}/{title}';
    assert.strictEqual(applyFormat(format, tags, 'original'), 'Unknown/Track Title');
  });

  it('should support {original}', () => {
    assert.strictEqual(applyFormat('{original}', tags, 'OriginalName'), 'OriginalName');
  });
});
