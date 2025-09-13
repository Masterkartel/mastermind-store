// scripts/print-uploads.js
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "public", "products.json");

(function run() {
  const arr = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const expect = [];

  for (const p of arr) {
    if (!p.img) {
      expect.push(`/products/${p.id}.jpg`);
    } else {
      const rel = p.img.replace(/^\//, "");
      const abs = path.join(__dirname, "..", "public", rel);
      if (!fs.existsSync(abs)) expect.push(p.img);
    }
  }

  if (expect.length === 0) {
    console.log("✅ No uploads needed. All referenced images exist.");
  } else {
    console.log("🗂️ Upload these files into /public/products/:");
    for (const e of expect) console.log(" -", e);
  }
})();
