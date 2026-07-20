const sharp = require('sharp');
const path = require('path');

const SRC = __dirname;
const OUT = path.join(__dirname, '..', 'images');

async function render(svgFile, outFile, size) {
  await sharp(path.join(SRC, svgFile), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(OUT, outFile));
  console.log(`wrote ${outFile} (${size}x${size})`);
}

(async () => {
  await render('icon-full.svg', 'icon.png', 1024);
  await render('icon-full.svg', 'favicon.png', 196);
  await render('icon-foreground.svg', 'android-icon-foreground.png', 1024);
  await render('icon-background.svg', 'android-icon-background.png', 1024);
  await render('icon-monochrome.svg', 'android-icon-monochrome.png', 1024);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
