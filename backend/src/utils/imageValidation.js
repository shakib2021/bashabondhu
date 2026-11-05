const imageValidationStrategies = {
  'image/jpeg': (buffer) => (
    buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff
  ),
  'image/png': (buffer) => (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ),
  'image/webp': (buffer) => (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ),
};

function isValidImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) return false;
  if (!Object.hasOwn(imageValidationStrategies, file.mimetype)) return false;
  const validationStrategy = imageValidationStrategies[file.mimetype];
  return validationStrategy(file.buffer);
}

module.exports = { isValidImage };
