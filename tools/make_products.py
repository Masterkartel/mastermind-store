# tools/make_products.py
import sys, json, re
from pathlib import Path
import pandas as pd

INPUT_XLSX = None
if len(sys.argv) >= 2:
    INPUT_XLSX = Path(sys.argv[1])
else:
    print("Usage: python tools/make_products.py <excel_file>")
    sys.exit(1)

OUT_JSON = Path("public/products.json")

def slug(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-") or "item"

def to_int_price(v):
    try:
        return int(round(float(str(v).replace(",", "").strip())))
    except Exception:
        return None

def to_int_stock(v):
    try:
        n = int(float(str(v).replace(",", "").strip()))
        return max(0, n)
    except Exception:
        return 0

def main():
    if not INPUT_XLSX.exists():
        print(f"Excel file not found: {INPUT_XLSX}")
        sys.exit(1)

    df = pd.read_excel(INPUT_XLSX)

    # Map your columns:
    # - Product Name is column B -> header usually "Product" (sometimes "Product Name" or "Name")
    # - Price is "Retail" (or "Retail Price")
    # - SKU is "Units"
    # - Stock: try common names (Quantity, Qty, Stock, Available)
    name_col = next(c for c in df.columns if str(c).strip().lower() in {"product","product name","name"})
    price_col = next(c for c in df.columns if str(c).strip().lower() in {"retail","retail price","price"})
    sku_col   = next(c for c in df.columns if str(c).strip().lower() in {"units","sku"})
    # stock column may vary; pick the first that exists
    stock_candidates = [c for c in df.columns if str(c).strip().lower() in {"quantity","qty","stock","available","balance","in stock"}]
    stock_col = stock_candidates[0] if stock_candidates else None

    items = []
    seen = set()

    for _, r in df.iterrows():
        name = str(r.get(name_col, "")).strip()
        if not name or name.lower().startswith("total"):
            continue

        price = to_int_price(r.get(price_col, None))
        if price is None:
            continue

        sku = str(r.get(sku_col, "")).strip()
        stock = to_int_stock(r.get(stock_col, 0)) if stock_col else 0

        iid = slug(name)
        base = iid; i = 2
        while iid in seen:
            iid = f"{base}-{i}"; i += 1
        seen.add(iid)

        items.append({
            "id": iid,
            "name": name,
            "sku": sku,          # “1” or “Other” or empty—kept as you requested
            "price": price,      # Retail only
            "stock": stock       # NEW: taken from Excel
        })

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(items, ensure_ascii=False, indent=2))
    print(f"✅ Wrote {len(items)} products to {OUT_JSON}")

if __name__ == "__main__":
    main()
