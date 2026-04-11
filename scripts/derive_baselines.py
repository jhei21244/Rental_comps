"""
derive_baselines.py
===================
Computes suburb × property_type × bedrooms rent baselines from clean listing data.

Input:  data/listings_clean.json
Output: data/suburb_baselines.json  (+ markdown table printed to stdout)

Usage:
    python scripts/derive_baselines.py
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "listings_clean.json"
OUTPUT_FILE = DATA_DIR / "suburb_baselines.json"


def percentile(sorted_values: list[float], p: float) -> float:
    """Return the p-th percentile (0–100) of a pre-sorted list."""
    if not sorted_values:
        return 0.0
    n = len(sorted_values)
    idx = (p / 100) * (n - 1)
    lo = int(idx)
    hi = min(lo + 1, n - 1)
    frac = idx - lo
    return sorted_values[lo] * (1 - frac) + sorted_values[hi] * frac


def median(sorted_values: list[float]) -> float:
    return percentile(sorted_values, 50)


def main():
    if not INPUT_FILE.exists():
        print(f"Input file not found: {INPUT_FILE}")
        print("Run parse_listings.py first.")
        sys.exit(1)

    listings = json.loads(INPUT_FILE.read_text())
    print(f"Loaded {len(listings)} clean listings\n")

    # Group by (suburb, property_type, bedrooms)
    groups: dict[tuple, list[float]] = defaultdict(list)
    for listing in listings:
        key = (
            listing["suburb"],
            listing["property_type"],
            listing["bedrooms"],
        )
        groups[key].append(float(listing["weekly_rent"]))

    # Also compute suburb-level aggregates (across all types/beds)
    suburb_all: dict[str, list[float]] = defaultdict(list)
    for listing in listings:
        suburb_all[listing["suburb"]].append(float(listing["weekly_rent"]))

    baselines: list[dict] = []

    for (suburb, prop_type, bedrooms), rents in sorted(groups.items()):
        rents.sort()
        baselines.append(
            {
                "suburb": suburb,
                "property_type": prop_type,
                "bedrooms": bedrooms,
                "median_rent": round(median(rents)),
                "p10": round(percentile(rents, 10)),
                "p90": round(percentile(rents, 90)),
                "count": len(rents),
            }
        )

    OUTPUT_FILE.write_text(json.dumps(baselines, indent=2))
    print(f"Saved {len(baselines)} baseline groups → {OUTPUT_FILE}\n")

    # -----------------------------------------------------------------------
    # Markdown table: focus on 2BR apartments (the model's reference point)
    # -----------------------------------------------------------------------
    print("## 2BR Apartment Baselines\n")
    print(f"| {'Suburb':<20} | {'Median':>8} | {'P10':>6} | {'P90':>6} | {'N':>5} |")
    print(f"|{'-'*22}|{'-'*10}|{'-'*8}|{'-'*8}|{'-'*7}|")

    two_br = [b for b in baselines if b["property_type"] == "apartment" and b["bedrooms"] == 2]
    for b in sorted(two_br, key=lambda x: x["suburb"]):
        print(
            f"| {b['suburb']:<20} | ${b['median_rent']:>7} | ${b['p10']:>5} | "
            f"${b['p90']:>5} | {b['count']:>5} |"
        )

    # -----------------------------------------------------------------------
    # Markdown table: all suburbs, all types, 2BR
    # -----------------------------------------------------------------------
    print("\n## All Property Types — 2BR\n")
    print(f"| {'Suburb':<20} | {'Type':<12} | {'Median':>8} | {'P10':>6} | {'P90':>6} | {'N':>5} |")
    print(f"|{'-'*22}|{'-'*14}|{'-'*10}|{'-'*8}|{'-'*8}|{'-'*7}|")

    all_two_br = [b for b in baselines if b["bedrooms"] == 2]
    for b in sorted(all_two_br, key=lambda x: (x["suburb"], x["property_type"])):
        print(
            f"| {b['suburb']:<20} | {b['property_type']:<12} | "
            f"${b['median_rent']:>7} | ${b['p10']:>5} | ${b['p90']:>5} | {b['count']:>5} |"
        )

    print(f"\nTotal groups: {len(baselines)}")


if __name__ == "__main__":
    main()
