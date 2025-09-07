# tools/make_products.py
import json, re, sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Pandas not found. Install with:  pip install pandas openpyxl")
    sys.exit(1)

# ----- CONFIG -----
# Path to your Excel file:
XLSX_PATH = Path("Inventory Report 2025-09-06 22_09_56.xlsx")  # change if needed
SHEET_NAME = 0  # first sheet; change if your data is on another sheet
# ------------------

def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "item"

def normalize_sku(v):
    if v is None:
        return ""
    s = str(v).strip()
    if s == "1" or s.lower() == "other":
        return s
    return ""

def to_int_price(v):
    # keep prices as integers (KES). If floats/strings, coerce safely.
    try:
        return int(round(float(str(v).replace(",", "").strip())))
    except Exception:
        return 0

def main():
    if not XLSX_PATH.exists():
        print(f"Excel file not found: {XLSX_PATH.resolve()}")
        sys.exit(1)

    df = pd.read_excel(XLSX_PATH, sheet_name=SHEET_NAME)

    # Try to be resilient to header naming variations
    # Expected columns: Product (name), Units (sku), Retail (price)
    colmap = {}
    for col in df.columns:
        c = str(col).strip().lower()
        if c in ("product", "product name", "name"):
            colmap["name"] = col
        elif c in ("units", "sku"):
            colmap["sku"] = col
        elif c in ("retail", "retail price", "price"):
            colmap["price"] = col

    missing = [k for k in ("name", "sku", "price") if k not in colmap]
    if missing:
        print("Missing columns in Excel:", missing)
        print("Found columns:", list(df.columns))
        sys.exit(1)

    items = []
    seen_ids = set()

    for _, row in df.iterrows():
        name = str(row[colmap["name"]]).strip()
        if not name or name.lower().startswith("total"):
            continue

        sku = normalize_sku(row[colmap["sku"]])
        price = to_int_price(row[colmap["price"]])

        if price <= 0:
            # skip rows without a valid retail price
            continue

        base_id = slugify(name)
        uid = base_id
        n = 2
        while uid in seen_ids:
            uid = f"{base_id}-{n}"
            n += 1
        seen_ids.add(uid)

        items.append({
            "id": uid,
            "name": name,
            "sku": sku,
            "price": price
        })

    out_path = Path("public/products.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(items, ensure_ascii=False, indent=2))
    print(f"Wrote {len(items)} products to {out_path}")

if __name__ == "__main__":
    main()
