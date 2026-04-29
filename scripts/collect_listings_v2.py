#!/usr/bin/env python3
"""
collect_listings_v2.py — Incremental version with resume support.
Saves after every listing so progress is never lost.
"""

import json
import re
import time
import statistics
from pathlib import Path
from playwright.sync_api import sync_playwright

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = DATA_DIR / "all_listings_raw.json"

SUBURBS = [
    {"name": "brunswick",      "slug": "brunswick-vic-3056"},
    {"name": "fitzroy",        "slug": "fitzroy-vic-3065"},
    {"name": "northcote",      "slug": "northcote-vic-3070"},
    {"name": "collingwood",    "slug": "collingwood-vic-3066"},
    {"name": "carlton",        "slug": "carlton-vic-3053"},
    {"name": "thornbury",      "slug": "thornbury-vic-3071"},
    {"name": "coburg",         "slug": "coburg-vic-3058"},
    {"name": "brunswick-east", "slug": "brunswick-east-vic-3057"},
    {"name": "richmond",       "slug": "richmond-vic-3121"},
    {"name": "abbotsford",     "slug": "abbotsford-vic-3067"},
    {"name": "hawthorn",       "slug": "hawthorn-vic-3122"},
    {"name": "camberwell",     "slug": "camberwell-vic-3124"},
    {"name": "st-kilda",       "slug": "st-kilda-vic-3182"},
    {"name": "prahran",        "slug": "prahran-vic-3181"},
    {"name": "south-yarra",    "slug": "south-yarra-vic-3141"},
    {"name": "windsor",        "slug": "windsor-vic-3181"},
    {"name": "elsternwick",    "slug": "elsternwick-vic-3185"},
    {"name": "south-melbourne","slug": "south-melbourne-vic-3205"},
    {"name": "port-melbourne", "slug": "port-melbourne-vic-3207"},
    {"name": "docklands",      "slug": "docklands-vic-3008"},
    {"name": "footscray",      "slug": "footscray-vic-3011"},
    {"name": "kensington",     "slug": "kensington-vic-3031"},
    {"name": "moonee-ponds",   "slug": "moonee-ponds-vic-3039"},
    {"name": "preston",        "slug": "preston-vic-3072"},
]

PAGES = 3
DELAY = 1.2

JS_CARDS = """() => {
    const r = [];
    document.querySelectorAll('[data-testid="listing-card-wrapper-premiumplus"],[data-testid="listing-card-wrapper-standard"]').forEach(c => {
        const price = c.querySelector('[data-testid="listing-card-price"]')?.innerText?.trim();
        const link = c.querySelector('a')?.href;
        const features = [...c.querySelectorAll('[data-testid="property-features-text-container"]')].map(f=>f.innerText.trim());
        if (price && link && price.match(/\\$[\\d,]+/)) r.push({price,link,features});
    });
    return JSON.stringify(r);
}"""

def parse_price(t):
    m = re.search(r'\$([\d,]+)', t)
    return int(m.group(1).replace(',','')) if m else None

def parse_parking(features):
    for f in features:
        if 'Parking' in f:
            m = re.search(r'(\d+)', f)
            return int(m.group(1)) if m else 1
    return 0

def parse_attrs(desc):
    d = desc.lower()
    has_ac = any(k in d for k in ["split system","air con","aircon","ducted","reverse cycle","cooling","air-con"])
    if "ducted" in d: ac_type = "whole_ducted"
    elif any(k in d for k in ["split system","split-system","reverse cycle"]): ac_type = "one_room"
    else: ac_type = "none"
    if any(k in d for k in ["courtyard","garden"," yard ","outdoor area"]): outdoor = "courtyard_garden"
    elif "balcon" in d: outdoor = "balcony"
    else: outdoor = "none"
    if any(k in d for k in ["lock-up","lock up","lockup","secure garage"]): park_t = "lockup_garage"
    elif "undercover" in d: park_t = "undercover"
    elif "carport" in d: park_t = "carport"
    elif "garage" in d: park_t = "garage"
    else: park_t = "unknown"
    if any(k in d for k in ["brand new","new apartment","newly built","new build","just completed"]): cond = "new_build"
    elif any(k in d for k in ["newly renovated","just renovated","freshly renovated","recently renovated","renovated"]): cond = "renovated"
    elif any(k in d for k in ["character","original","period feature","classic"]): cond = "dated"
    else: cond = "maintained"
    laundry = any(k in d for k in ["internal laundry","euro laundry","european laundry","laundry in","in-unit laundry","washing machine"])
    furnished = any(k in d for k in ["fully furnished","furnished apartment","comes furnished","furnished property"])
    return {"has_aircon":has_ac,"aircon_type":ac_type,"outdoor_space":outdoor,"parking_type":park_t,
            "condition":cond,"internal_laundry":laundry,"furnished":furnished,"dishwasher":"dishwasher" in d}

def main():
    # Load existing data for resume
    existing = []
    done_links = set()
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text())
        done_links = {item["link"] for item in existing if "has_aircon" in item}
        print(f"Resuming — {len(existing)} listings already saved, {len(done_links)} with attributes")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
            locale="en-AU"
        )
        page = ctx.new_page()

        # STEP 1: collect card URLs
        all_items = list(existing)
        existing_links = {item["link"] for item in existing}

        print("\n=== Collecting listing URLs ===")
        for suburb in SUBURBS:
            suburb_new = 0
            for pg in range(1, PAGES + 1):
                url = f"https://www.domain.com.au/rent/{suburb['slug']}/?bedrooms=2&property-type=apartments"
                if pg > 1: url += f"&page={pg}"
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=20000)
                    time.sleep(DELAY)
                    cards = json.loads(page.evaluate(JS_CARDS))
                    new = 0
                    for c in cards:
                        price = parse_price(c["price"])
                        if price and c["link"] not in existing_links:
                            item = {"suburb": suburb["name"], "price_pw": price,
                                    "parking_spaces": parse_parking(c["features"]),
                                    "link": c["link"], "features": c["features"]}
                            all_items.append(item)
                            existing_links.add(c["link"])
                            new += 1
                            suburb_new += 1
                    if len(cards) < 5: break
                except Exception as e:
                    print(f"  Error {suburb['name']} p{pg}: {e}")
                    break
                time.sleep(DELAY)
            print(f"  {suburb['name']:20s}: +{suburb_new} new listings")

        print(f"\nTotal listings: {len(all_items)} | Need attributes: {sum(1 for i in all_items if 'has_aircon' not in i)}")

        # STEP 2: attribute extraction (incremental save)
        need_attrs = [i for i in all_items if "has_aircon" not in i]
        total = len(need_attrs)
        print(f"\n=== Extracting attributes for {total} listings ===")

        for idx, item in enumerate(need_attrs):
            try:
                page.goto(item["link"], wait_until="domcontentloaded", timeout=20000)
                time.sleep(0.8)
                # click read more
                page.evaluate("() => { const b = [...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Read more'); if(b) b.click(); }")
                time.sleep(0.3)
                desc = page.evaluate("() => document.querySelector('[data-testid=\"listing-details__description\"]')?.innerText || ''")
                attrs = parse_attrs(desc or "")
                item.update(attrs)
                item["desc_snippet"] = (desc or "")[:200]

                status = f"AC={attrs['has_aircon']} {attrs['outdoor_space']} {attrs['condition']}"
                if attrs["internal_laundry"]: status += " +laundry"
                if attrs["furnished"]: status += " +furnished"
                print(f"  [{idx+1}/{total}] {item['suburb']:15s} ${item['price_pw']:4d}/wk — {status}")

            except Exception as e:
                item["error"] = str(e)
                print(f"  [{idx+1}/{total}] ERROR: {e}")

            # Save after every listing
            OUTPUT_FILE.write_text(json.dumps(all_items, indent=2))
            time.sleep(DELAY)

        browser.close()

    # Final summary
    print(f"\n=== DONE — {len(all_items)} listings saved ===\n")
    by_suburb = {}
    for item in all_items:
        s = item["suburb"]
        by_suburb.setdefault(s, []).append(item["price_pw"])

    print("Suburb medians (2BR apartments, asking price):")
    for s, prices in sorted(by_suburb.items()):
        med = int(statistics.median(prices))
        p10 = int(sorted(prices)[max(0, int(len(prices)*0.1))])
        p90 = int(sorted(prices)[min(len(prices)-1, int(len(prices)*0.9))])
        print(f"  {s:20s}: median=${med}  p10=${p10}  p90=${p90}  n={len(prices)}")

if __name__ == "__main__":
    main()
