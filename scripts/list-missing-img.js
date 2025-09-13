// scripts/list-missing-img.js
const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "public", "products.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

try {
  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("❌ public/products.json not found.");
    process.exit(1);
  }

  const data = loadJson(PRODUCTS_PATH);
  if (!Array.isArray(data)) {
    console.error("❌ products.json is not an array.");
    process.exit(1);
  }

  const missing = [];
  for (const p of data) {
    const img = p?.img || `/products/${p.id}.jpg`;
    const diskPath = path.join(PUBLIC_DIR, img.replace(/^\//, ""));
    if (!fs.existsSync(diskPath)) {
      missing.push({ id: p.id, expected: img });
    }
  }

  if (missing.length === 0) {
    console.log("✅ All product images are present on disk.");
  } else {
    console.log("⚠️ Missing image files:");
    for (const m of missing) {
      console.log(` - ${m.id} → ${m.expected}`);
    }
  }
} catch (e) {
  console.error("❌ Failed:", e);
  process.exit(1);
}
