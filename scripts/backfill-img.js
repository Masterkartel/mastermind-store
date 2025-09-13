// scripts/backfill-img.js
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "public", "products.json");
const IMG_DIR = path.join(__dirname, "..", "public", "products");
const exts = [".jpg", ".png", ".webp"];

function findExistingForId(id) {
  for (const ext of exts) {
    const p = path.join(IMG_DIR, `${id}${ext}`);
    if (fs.existsSync(p)) return `/products/${id}${ext}`;
  }
  return null;
}

function run() {
  const raw = fs.readFileSync(FILE, "utf8");
  const arr = JSON.parse(raw);

  let changed = false;
  const updated = arr.map((p) => {
    // if img is already valid on disk, keep it
    if (p.img) {
      const rel = p.img.replace(/^\//, "");
      const abs = path.join(__dirname, "..", "public", rel);
      if (fs.existsSync(abs)) return p;
    }
    // otherwise find one that exists by id + extension
    const existing = findExistingForId(p.id);
    if (existing) {
      p.img = existing;
      changed = true;
      return p;
    }
    // default guess (so UI still has a path to use)
    p.img = `/products/${p.id}.jpg`;
    changed = true;
    return p;
  });

  if (!changed) {
    console.log("✅ No changes needed.");
    return;
  }

  const backup = FILE + ".bak-" + Date.now();
  fs.writeFileSync(backup, raw);
  console.log("📦 Backup saved:", backup);

  fs.writeFileSync(FILE, JSON.stringify(updated, null, 2));
  console.log("✨ Updated", FILE);
}

run();
