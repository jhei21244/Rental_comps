#!/usr/bin/env python3
"""
collect_listings.py — Collect rental listing URLs + card data from Domain.com.au
Visits search result pages for all target suburbs, extracts listing cards,
then visits each individual listing page for full attribute data.

Saves to /home/openclaw/projects/fairrent/data/all_listings_raw.json
"""

import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

DATA_DIR = Path("/home/openclaw/projects/fairrent/data")
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = DATA_DIR / "all_listings_raw.json"

SUBURBS = [
    # Inner north
    {"name": "brunswick",     "slug": "brunswick-vic-3056"},
    {"name": "fitzroy",       "slug": "fitzroy-vic-3065"},
    {"name": "northcote",     "slug": "northcote-vic-3070"},
    {"name": "collingwood",   "slug": "collingwood-vic-3066"},
    {"name": "carlton",       "slug": "carlton-vic-3053"},
    {"name": "thornbury",     "slug": "thornbury-vic-3071"},
    {"name": "coburg",        "slug": "coburg-vic-3058"},
    {"name": "brunswick-east","slug": "brunswick-east-vic-3057"},
    # Inner east/south-east
    {"name": "richmond",      "slug": "richmond-vic-3121"},
    {"name": "abbotsford",    "slug": "abbotsford-vic-3067"},
    {"name": "hawthorn",      "slug": "hawthorn-vic-3122"},
    {"name": "camberwell",    "slug": "camberwell-vic-3124"},
    # Inner south
    {"name": "st-kilda",      "slug": "st-kilda-vic-3182"},
    {"name": "prahran",       "slug": "prahran-vic-3181"},
    {"name": "south-yarra",   "slug": "south-yarra-vic-3141"},
    {"name": "windsor",       "slug": "windsor-vic-3181"},
    {"name": "elsternwick",   "slug": "elsternwick-vic-3185"},
    # Inner west/CBD fringe
    {"name": "south-melbourne","slug": "south-melbourne-vic-3205"},
    {"name": "port-melbourne", "slug": "port-melbourne-vic-3207"},
    {"name": "docklands",     "slug": "docklands-vic-3008"},
    {"name": "footscray",     "slug": "footscray-vic-3011"},
    {"name": "kensington",    "slug": "kensington-vic-3031"},
    {"name": "moonee-ponds",  "slug": "moonee-ponds-vic-3039"},
    {"name": "preston",       "slug": "preston-vic-3072"},
]

PAGES_PER_SUBURB = 3
BEDROOMS = 2
DELAY = 1.5

JS_EXTRACT_CARDS = """
() => {
    const results = [];
    const cards = document.querySelectorAll(
        '[data-testid="listing-card-wrapper-premiumplus"], [data-testid="listing-card-wrapper-standard"]'
    );
    cards.forEach(card => {
        const price = card.querySelector('[data-testid="listing-card-price"]')?.innerText?.trim();
        const link = card.querySelector('a')?.href;
        const features = [...card.querySelectorAll('[data-testid="property-features-text-container"]')]
            .map(f => f.innerText.trim());
        if (price && link && price.match(/\\$[\\d,]+/)) {
            results.push({ price, link, features });
        }
    });
    return JSON.stringify(results);
}
"""

JS_EXTRACT_DESCRIPTION = """
() => {
    // Click read more if present
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Read more');
    if (btn) btn.click();
    return null;
}
"""

JS_GET_DESCRIPTION = """
() => {
    const desc = document.querySelector('[data-testid="listing-details__description"]');
    return desc ? desc.innerText : '';
}
"""

def parse_price(price_text):
    m = re.search(r'\$([\d,]+)', price_text)
    if m:
        return int(m.group(1).replace(',', ''))
    return None

def parse_parking(features):
    for f in features:
        if 'Parking' in f:
            m = re.search(r'(\d+)', f)
            return int(m.group(1)) if m else 1
    return 0

def parse_attributes(desc_text):
    desc = desc_text.lower()
    
    has_aircon = any(kw in desc for kw in ["split system", "air con", "aircon", "ducted", "reverse cycle", "cooling", "air-con"])
    
    if "ducted" in desc:
        aircon_type = "whole_ducted"
    elif any(kw in desc for kw in ["split system", "split-system", "reverse cycle"]):
        aircon_type = "one_room"
    else:
        aircon_type = "none"
    
    if any(kw in desc for kw in ["courtyard", "garden", "yard", "outdoor area"]):
        outdoor = "courtyard_garden"
    elif "balcon" in desc:
        outdoor = "balcony"
    else:
        outdoor = "none"
    
    if any(kw in desc for kw in ["lock-up", "lock up", "lockup", "secure garage"]):
        parking_type = "lockup_garage"
    elif "undercover" in desc:
        parking_type = "undercover"
    elif "carport" in desc:
        parking_type = "carport"
    elif "garage" in desc:
        parking_type = "garage"
    else:
        parking_type = "unknown"
    
    if any(kw in desc for kw in ["brand new", "new apartment", "newly built", "new build", "just completed", "newly constructed"]):
        condition = "new_build"
    elif any(kw in desc for kw in ["newly renovated", "just renovated", "freshly renovated", "recently renovated", "renovated"]):
        condition = "renovated"
    elif any(kw in desc for kw in ["character", "original", "period feature", "classic", "retro", "dated"]):
        condition = "dated"
    else:
        condition = "maintained"
    
    internal_laundry = any(kw in desc for kw in [
        "internal laundry", "in-unit laundry", "laundry within", "euro laundry",
        "european laundry", "washer dryer", "washing machine", "laundry facilities"
    ])
    
    furnished = any(kw in desc for kw in [
        "fully furnished", "furnished apartment", "comes furnished",
        "furnished property", "furnished home"
    ])
    
    dishwasher = "dishwasher" in desc
    
    return {
        "has_aircon": has_aircon,
        "aircon_type": aircon_type,
        "outdoor_space": outdoor,
        "parking_type": parking_type,
        "condition": condition,
        "internal_laundry": internal_laundry,
        "furnished": furnished,
        "dishwasher": dishwasher,
    }

def main():
    all_listings = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="en-AU"
        )
        page = ctx.new_page()
        
        # STEP 1: Collect listing URLs from search pages
        listing_urls = []
        
        for suburb in SUBURBS:
            suburb_total = 0
            for pg in range(1, PAGES_PER_SUBURB + 1):
                url = f"https://www.domain.com.au/rent/{suburb['slug']}/?bedrooms={BEDROOMS}&property-type=apartments"
                if pg > 1:
                    url += f"&page={pg}"
                
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=20000)
                    time.sleep(DELAY)
                    raw = page.evaluate(JS_EXTRACT_CARDS)
                    cards = json.loads(raw)
                    
                    for card in cards:
                        price = parse_price(card["price"])
                        if price:
                            listing_urls.append({
                                "suburb": suburb["name"],
                                "price_pw": price,
                                "parking_spaces": parse_parking(card["features"]),
                                "link": card["link"],
                                "features": card["features"],
                            })
                            suburb_total += 1
                    
                    if len(cards) < 5:
                        break  # No more pages
                        
                except Exception as e:
                    print(f"  Error {suburb['name']} p{pg}: {e}")
                    break
                    
                time.sleep(DELAY)
            
            print(f"  {suburb['name']}: {suburb_total} listings")
        
        print(f"\nTotal listings collected: {len(listing_urls)}")
        print("Now extracting attributes from individual pages...\n")
        
        # STEP 2: Visit each listing for attributes
        for i, item in enumerate(listing_urls):
            try:
                page.goto(item["link"], wait_until="domcontentloaded", timeout=20000)
                time.sleep(1.0)
                page.evaluate(JS_EXTRACT_DESCRIPTION)
                time.sleep(0.3)
                desc = page.evaluate(JS_GET_DESCRIPTION)
                attrs = parse_attributes(desc or "")
                item.update(attrs)
                item["description_snippet"] = desc[:300] if desc else ""
                
                status = f"AC={attrs['has_aircon']} outdoor={attrs['outdoor_space']} {attrs['condition']}"
                if attrs.get('internal_laundry'):
                    status += " laundry"
                if attrs.get('furnished'):
                    status += " furnished"
                print(f"  [{i+1}/{len(listing_urls)}] {item['suburb']} ${item['price_pw']}/wk — {status}")
                
            except Exception as e:
                print(f"  [{i+1}] Error on {item['link']}: {e}")
            
            time.sleep(DELAY)
        
        browser.close()
    
    # Save
    OUTPUT_FILE.write_text(json.dumps(all_listings + listing_urls, indent=2))
    print(f"\nSaved {len(listing_urls)} listings → {OUTPUT_FILE}")
    
    # Quick analysis
    import statistics
    by_suburb = {}
    for item in listing_urls:
        s = item["suburb"]
        if s not in by_suburb:
            by_suburb[s] = []
        by_suburb[s].append(item["price_pw"])
    
    print("\n=== SUBURB MEDIANS ===")
    for suburb, prices in sorted(by_suburb.items()):
        if prices:
            med = statistics.median(prices)
            print(f"  {suburb:20s}: median=${int(med)}/wk  n={len(prices)}")

if __name__ == "__main__":
    main()
