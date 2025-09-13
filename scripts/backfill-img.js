// scripts/backfill-img.js
const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "public", "products.json");
const BACKUP_PATH = path.join(process.cwd(), "public", `products.backup.${Date.now()}.json`);

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
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

  // backup first
  fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);

  let changed = 0;
  const next = data.map((p) => {
    if (!p || typeof p !== "object") return p;
    if (!p.img || String(p.img).trim() === "") {
      p.img = `/products/${p.id}.jpg`; // upload this file name
      changed++;
    }
    return p;
  });

  saveJson(PRODUCTS_PATH, next);

  console.log(`✅ Done. ${changed} product(s) got an img.`);
  console.log(`💾 Backup saved at: ${BACKUP_PATH}`);
  console.log(`🖼️ Upload files to: public/products/<id>.jpg`);
} catch (e) {
  console.error("❌ Failed:", e);
  process.exit(1);
}
