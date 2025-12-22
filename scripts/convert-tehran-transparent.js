const JimpPkg = require('jimp')
const Jimp = JimpPkg.Jimp ? JimpPkg.Jimp : (JimpPkg && JimpPkg.default ? JimpPkg.default : JimpPkg)
const path = require('path')

const src = path.join(__dirname, '..', 'public', 'assets', 'areas', 'tehran_regions.png')
const out = path.join(__dirname, '..', 'public', 'assets', 'areas', 'tehran_regions_transparent.png')

const THRESHOLD = 240 // pixels with r,g,b >= THRESHOLD are treated as background

Jimp.read(src)
  .then(image => {
    const w = image.bitmap.width
    const h = image.bitmap.height
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const rgba = JimpPkg.intToRGBA(image.getPixelColor(x, y))
        const { r, g, b } = rgba
        if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
          // make fully transparent
          const newColor = JimpPkg.rgbaToInt(r, g, b, 0)
          image.setPixelColor(newColor, x, y)
        }
      }
    }
    return new Promise((resolve, reject) => {
      image.write(out, err => {
        if (err) return reject(err)
        resolve()
      })
    })
  })
  .then(() => console.log('Saved:', out))
  .catch(err => {
    console.error('Conversion failed:', err)
    process.exit(1)
  })
