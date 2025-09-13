// scripts/backfill-img.js
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "public", "products.json");

function run() {
  const raw = fs.readFileSync(FILE, "utf8");
  const arr = JSON.parse(raw);

  let changed = false;
  const updated = arr.map((p) => {
    if (!p.img) {
      p.img = `/products/${p.id}.jpg`;
      changed = true;
    }
    return p;
  });

  if (!changed) {
    console.log("✅ No missing images, products.json unchanged.");
    return;
  }

  // backup before overwrite
  const backup = FILE + ".bak-" + Date.now();
  fs.writeFileSync(backup, raw);
  console.log("📦 Backup saved to", backup);

  fs.writeFileSync(FILE, JSON.stringify(updated, null, 2));
  console.log("✨ Updated", FILE, "with backfilled images.");
}

run();
