// scripts/print-uploads.js
const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "public", "products.json");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

try {
  const data = loadJson(PRODUCTS_PATH);
  if (!Array.isArray(data)) {
    console.error("❌ products.json is not an array.");
    process.exit(1);
  }

  console.log("Upload these files (if not already present):");
  for (const p of data) {
    const img = p?.img || `/products/${p.id}.jpg`;
    console.log(` - public${img}`);
  }
} catch (e) {
  console.error("❌ Failed:", e);
  process.exit(1);
}
