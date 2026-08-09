import sharp from "sharp";
import { fileURLToPath } from "node:url";

const source = new URL("../public/pwa-icon.svg", import.meta.url);
const outputs = [
  [192, new URL("../public/pwa-icon-192.png", import.meta.url)],
  [512, new URL("../public/pwa-icon-512.png", import.meta.url)],
  [512, new URL("../public/pwa-icon-maskable-512.png", import.meta.url)],
];

await Promise.all(
  outputs.map(([size, destination]) =>
    sharp(fileURLToPath(source))
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true })
      .toFile(fileURLToPath(destination)),
  ),
);
