const path = require('path');

async function main() {
  let sharp;
  try {
    // eslint-disable-next-line global-require
    sharp = require('sharp');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Missing dependency: sharp. Run: npm install');
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  const input = path.resolve(projectRoot, 'assets', 'icon.png');
  const outSquareWhite = path.resolve(projectRoot, 'assets', 'icon-square.png');
  const outForeground = path.resolve(projectRoot, 'assets', 'icon-foreground.png');

  const size = 1024;

  // 1) Square icon with WHITE background (good for expo.icon / favicon)
  await sharp(input)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outSquareWhite);

  // 2) Square foreground icon with TRANSPARENT background (good for adaptive icon foreground)
  await sharp(input)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outForeground);

  // eslint-disable-next-line no-console
  console.log('Generated:');
  // eslint-disable-next-line no-console
  console.log('-', path.relative(projectRoot, outSquareWhite));
  // eslint-disable-next-line no-console
  console.log('-', path.relative(projectRoot, outForeground));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
