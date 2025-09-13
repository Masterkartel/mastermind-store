// scripts/list-missing-img.js
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "public", "products.json");
const IMG_DIR = path.join(__dirname, "..", "public", "products");
const exts = [".jpg", ".png", ".webp"];

// if given "id" try id.jpg/png/webp; if given "/products/x.jpg" check that exact file
function existsAny(idOrPath) {
  if (idOrPath.includes("/")) {
    const abs = path.join(__dirname, "..", "public", idOrPath.replace(/^\//, ""));
    return fs.existsSync(abs);
  }
  for (const ext of exts) {
    if (fs.existsSync(path.join(IMG_DIR, `${idOrPath}${ext}`))) return true;
  }
  return false;
}

(function run() {
  const arr = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const missing = [];

  for (const p of arr) {
    if (p.img) {
      if (!existsAny(p.img)) missing.push({ id: p.id, expected: p.img });
    } else if (!existsAny(p.id)) {
      missing.push({ id: p.id, expected: `/products/${p.id}.jpg` });
    }
  }

  if (missing.length === 0) {
    console.log("✅ All product images are present.");
  } else {
    console.log("❌ Missing image files for:");
    for (const m of missing) console.log(` - ${m.id} → ${m.expected}`);
  }
})();
