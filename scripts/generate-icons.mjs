import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#4f46e5"/>
  <text x="256" y="320" font-family="Arial" font-size="320" font-weight="bold" fill="white" text-anchor="middle">F</text>
</svg>`;

await sharp(Buffer.from(svg)).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile("public/icon-512.png");

console.log("Icons generated!");
