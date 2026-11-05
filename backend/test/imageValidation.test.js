const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isValidImage } = require('../src/utils/imageValidation');

test('validates image signatures with the strategy for each supported MIME type', () => {
  const images = [
    {
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    },
    {
      mimetype: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
    {
      mimetype: 'image/webp',
      buffer: Buffer.from('RIFF0000WEBP'),
    },
  ];

  for (const image of images) {
    assert.equal(isValidImage(image), true);
  }
});

test('rejects unsupported MIME types and mismatched image signatures', () => {
  assert.equal(isValidImage({ mimetype: 'image/gif', buffer: Buffer.from('GIF89a') }), false);
  assert.equal(isValidImage({ mimetype: 'constructor', buffer: Buffer.from('not an image') }), false);
  assert.equal(isValidImage({ mimetype: 'image/png', buffer: Buffer.from('not a PNG') }), false);
  assert.equal(isValidImage({ mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8]) }), false);
  assert.equal(isValidImage({ mimetype: 'image/webp', buffer: Buffer.from('RIFF0000XXXX') }), false);
  assert.equal(isValidImage(null), false);
});
