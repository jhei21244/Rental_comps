#!/usr/bin/env python3
"""
Domain.com.au listing attribute extractor for FairRent hedonic model.
Extracts attributes from rental listing pages using Playwright.
"""

import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

DATA_DIR = Path("/home/openclaw/projects/fairrent/data")
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = DATA_DIR / "listing_attributes.json"
ANALYSIS_FILE = DATA_DIR / "attribute_analysis.txt"

# Known listing URLs with pre-known price/parking data
KNOWN_LISTINGS = [
    # Brunswick
    {"url": "https://www.domain.com.au/23-crook-street-brunswick-vic-3056-18073661", "suburb": "brunswick", "price_pw": 720, "parking_spaces": 0},
    {"url": "https://www.domain.com.au/116-gold-street-brunswick-vic-3056-18070345", "suburb": "brunswick", "price_pw": 750, "parking_spaces": 0},
    {"url": "https://www.domain.com.au/211-201-207-albert-street-brunswick-vic-3056-16871444", "suburb": "brunswick", "price_pw": 625, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/a303-460-victoria-street-brunswick-vic-3056-18048798", "suburb": "brunswick", "price_pw": 630, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/5b-murdock-street-brunswick-vic-3056-18037826", "suburb": "brunswick", "price_pw": 795, "parking_spaces": 1},
    # Fitzroy
    {"url": "https://www.domain.com.au/207-57-61-johnston-street-fitzroy-vic-3065-15993011", "suburb": "fitzroy", "price_pw": 780, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/11-175-fitzroy-street-fitzroy-vic-3065-18056306", "suburb": "fitzroy", "price_pw": 800, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/47-young-street-fitzroy-vic-3065-18062104", "suburb": "fitzroy", "price_pw": 775, "parking_spaces": 0},
    {"url": "https://www.domain.com.au/108-353-napier-street-fitzroy-vic-3065-18060655", "suburb": "fitzroy", "price_pw": 750, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/10-165-rose-street-fitzroy-vic-3065-18056142", "suburb": "fitzroy", "price_pw": 850, "parking_spaces": 0},
    # Northcote (one known)
    {"url": "https://www.domain.com.au/1-11-mckean-street-northcote-vic-3070-18077652", "suburb": "northcote", "price_pw": None, "parking_spaces": None},
    # Richmond
    {"url": "https://www.domain.com.au/806-633-church-street-richmond-vic-3121-18077031", "suburb": "richmond", "price_pw": 980, "parking_spaces": 2},
    {"url": "https://www.domain.com.au/3-175-kent-st-richmond-vic-3121-18003429", "suburb": "richmond", "price_pw": 690, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/3-45-davison-st-richmond-vic-3121-18074063", "suburb": "richmond", "price_pw": 720, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/61-fraser-street-richmond-vic-3121-18072414", "suburb": "richmond", "price_pw": 875, "parking_spaces": 1},
    {"url": "https://www.domain.com.au/1-51-bendigo-street-richmond-vic-3121-18070517", "suburb": "richmond", "price_pw": 900, "parking_spaces": 1},
]

# Search pages — need to extract first 5 listing URLs
SEARCH_PAGES = [
    {"url": "https://www.domain.com.au/rent/northcote-vic-3070/", "suburb": "northcote"},
    {"url": "https://www.domain.com.au/rent/st-kilda-vic-3182/?bedrooms=2&property-type=apartments", "suburb": "st_kilda"},
    {"url": "https://www.domain.com.au/rent/prahran-vic-3181/?bedrooms=2&property-type=apartments", "suburb": "prahran"},
    {"url": "https://www.domain.com.au/rent/collingwood-vic-3066/?bedrooms=2&property-type=apartments", "suburb": "collingwood"},
    {"url": "https://www.domain.com.au/rent/carlton-vic-3053/?bedrooms=2&property-type=apartments", "suburb": "carlton"},
]


def parse_floor(address: str, desc: str) -> str:
    addr_lower = address.lower()
    m = re.search(r'\blevel\s*(\d+)\b|\bl(\d+)\/', addr_lower)
    if m:
        lvl = int(m.group(1) or m.group(2))
        return "high" if lvl >= 4 else "upper"
    desc_lower = desc.lower()
    if "ground floor" in desc_lower or "ground level" in desc_lower:
        return "ground"
    if "level" in desc_lower:
        m2 = re.search(r'level\s*(\d+)', desc_lower)
        if m2:
            lvl = int(m2.group(1))
            return "high" if lvl >= 4 else "upper"
    return "unknown"


def parse_attributes(desc_text: str, address: str, price_pw=None, parking_spaces=None) -> dict:
    desc = desc_text.lower()

    # Aircon
    has_aircon = any(kw in desc for kw in [
        "split system", "air con", "aircon", "ducted", "reverse cycle", "cooling",
        "air conditioning", "air-conditioning"
    ])
    if "ducted" in desc:
        aircon_type = "ducted"
    elif any(kw in desc for kw in ["split system", "split-system", "reverse cycle"]):
        aircon_type = "split_system"
    elif has_aircon:
        aircon_type = "split_system"  # default when aircon mentioned but type unclear
    else:
        aircon_type = "none"

    # Outdoor space
    if "courtyard" in desc:
        outdoor_space = "courtyard"
    elif "balcon" in desc:
        outdoor_space = "balcony"
    elif "garden" in desc or "yard" in desc:
        outdoor_space = "garden"
    else:
        outdoor_space = "none"

    # Parking type
    if any(kw in desc for kw in ["lock-up garage", "lock up garage", "lockup garage", "lock-up", "lock up"]):
        parking_type = "lock_up_garage"
    elif "undercover" in desc or "basement" in desc:
        parking_type = "undercover"
    elif "carport" in desc:
        parking_type = "carport"
    elif parking_spaces and parking_spaces > 0:
        parking_type = "open"
    else:
        parking_type = "none"

    # Condition
    if any(kw in desc for kw in [
        "newly renovated", "brand new", "new apartment", "modern kitchen",
        "renovated", "stylish", "contemporary", "stunning", "immaculate", "brand-new"
    ]):
        condition = "new_renovated"
    elif any(kw in desc for kw in ["character", "original", "period", "classic", "vintage", "heritage"]):
        condition = "dated"
    else:
        condition = "maintained"

    # Pets
    if ("pet" in desc and "friendly" in desc) or "pets welcome" in desc or "pets considered" in desc:
        pets_ok = True
    elif "no pet" in desc or "pets not" in desc or "no animals" in desc:
        pets_ok = False
    else:
        pets_ok = None

    # Property type — from desc
    if any(kw in desc for kw in ["townhouse", "town house"]):
        property_type = "townhouse"
    elif any(kw in desc for kw in ["house", "cottage", "bungalow", "villa"]):
        property_type = "house"
    else:
        property_type = "apartment"

    return {
        "has_aircon": has_aircon,
        "aircon_type": aircon_type,
        "outdoor_space": outdoor_space,
        "floor_level": parse_floor(address, desc_text),
        "parking_type": parking_type,
        "condition": condition,
        "dishwasher": "dishwasher" in desc,
        "pets_ok": pets_ok,
        "property_type": property_type,
    }


def extract_price_from_page(page) -> int | None:
    """Try to find the weekly price on the listing page."""
    try:
        # Domain usually shows price in a span or div with "pw" or "per week"
        price_text = page.locator('[data-testid="listing-details__summary-title"]').first.text_content(timeout=3000)
        m = re.search(r'\$\s*([\d,]+)', price_text or "")
        if m:
            return int(m.group(1).replace(",", ""))
    except Exception:
        pass

    try:
        # Try broader search
        price_el = page.locator('p:has-text("per week"), p:has-text("pw"), [class*="price"]').first
        price_text = price_el.text_content(timeout=2000)
        m = re.search(r'\$\s*([\d,]+)', price_text or "")
        if m:
            return int(m.group(1).replace(",", ""))
    except Exception:
        pass

    # Search entire page text
    try:
        body = page.locator("body").text_content(timeout=3000)
        m = re.search(r'\$\s*([\d,]+)\s*(?:per week|pw|/week|/wk)', body or "", re.IGNORECASE)
        if m:
            return int(m.group(1).replace(",", ""))
    except Exception:
        pass

    return None


def extract_parking_from_page(page) -> int | None:
    """Try to extract parking spaces from listing page features."""
    try:
        body = page.locator("body").text_content(timeout=3000)
        # Look for parking icon text pattern
        m = re.search(r'(\d+)\s*(?:car|parking|garage|carspace)', body or "", re.IGNORECASE)
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return None


def extract_property_type_from_page(page) -> str:
    """Extract property type from page metadata."""
    try:
        body = page.locator("body").text_content(timeout=3000) or ""
        body_lower = body.lower()
        if "townhouse" in body_lower or "town house" in body_lower:
            return "townhouse"
        if "house" in body_lower[:500]:
            return "house"
    except Exception:
        pass
    return "apartment"


def scrape_search_page(page, search_url: str, suburb: str, max_results=5) -> list[dict]:
    """Navigate to a search results page and extract first N listing URLs."""
    print(f"  Fetching search page: {search_url}")
    try:
        page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)

        # Try to dismiss any popups/overlays
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass

        # Find listing card links — Domain uses links like /address-suburb-state-postcode-7digitid
        links = page.locator('a[href*="-vic-30"]').all()
        seen = set()
        results = []

        for link in links:
            try:
                href = link.get_attribute("href") or ""
                # Must match listing pattern: ends with 7-digit ID
                if not re.search(r'-\d{7,8}$', href):
                    continue
                if not href.startswith("http"):
                    href = "https://www.domain.com.au" + href
                if href in seen:
                    continue
                seen.add(href)
                results.append({"url": href, "suburb": suburb, "price_pw": None, "parking_spaces": None})
                if len(results) >= max_results:
                    break
            except Exception:
                continue

        print(f"    Found {len(results)} listings for {suburb}")
        return results

    except Exception as e:
        print(f"    ERROR on search page {search_url}: {e}")
        return []


def scrape_listing(page, url: str, suburb: str, known_price=None, known_parking=None) -> dict | None:
    """Scrape a single listing page and return extracted attributes."""
    print(f"  Scraping: {url}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)

        # Dismiss any overlays
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass

        # Click "Read more" if present
        try:
            read_more = page.locator('button:has-text("Read more"), [data-testid="listing-details__description-button"]').first
            if read_more.is_visible(timeout=2000):
                read_more.click()
                time.sleep(1)
        except Exception:
            pass

        # Extract description
        desc_text = ""
        try:
            desc_el = page.locator('[data-testid="listing-details__description"]').first
            desc_text = desc_el.text_content(timeout=3000) or ""
        except Exception:
            pass

        if not desc_text:
            try:
                # Fallback: look for large text blocks
                paras = page.locator('p').all()
                candidates = []
                for p in paras:
                    try:
                        t = p.text_content(timeout=500) or ""
                        if len(t) > 100:
                            candidates.append(t)
                    except Exception:
                        continue
                desc_text = " ".join(candidates[:5])
            except Exception:
                pass

        # Extract price if not known
        price_pw = known_price
        if price_pw is None:
            price_pw = extract_price_from_page(page)

        # Extract parking if not known
        parking_spaces = known_parking
        if parking_spaces is None:
            parking_spaces = extract_parking_from_page(page)

        # Parse address from URL for floor detection
        address_slug = url.split("domain.com.au/")[-1].split("/")[0]

        # Parse attributes from description
        attrs = parse_attributes(desc_text, address_slug, price_pw, parking_spaces)

        # Override property type from page if we got one
        if not desc_text:
            page_prop_type = extract_property_type_from_page(page)
            attrs["property_type"] = page_prop_type

        result = {
            "suburb": suburb,
            "url": url,
            "price_pw": price_pw,
            "parking_spaces": parking_spaces if parking_spaces is not None else 0,
            **attrs,
            "full_description": desc_text.strip(),
        }

        price_str = f"${price_pw}/wk" if price_pw else "price unknown"
        print(f"    OK — {price_str} | aircon={attrs['has_aircon']} | outdoor={attrs['outdoor_space']} | {attrs['condition']}")
        return result

    except PlaywrightTimeoutError:
        print(f"    TIMEOUT: {url}")
        return None
    except Exception as e:
        print(f"    ERROR: {url} — {e}")
        return None


def run_analysis(listings: list[dict]) -> str:
    """Compute attribute premium analysis."""
    lines = []
    lines.append("=" * 60)
    lines.append("ATTRIBUTE PREMIUM ANALYSIS — FairRent Hedonic Model")
    lines.append("=" * 60)
    lines.append("")

    # Filter to listings with price
    priced = [l for l in listings if l.get("price_pw") and isinstance(l["price_pw"], (int, float))]
    lines.append(f"Total listings scraped: {len(listings)}")
    lines.append(f"Listings with known price: {len(priced)}")
    lines.append("")

    def avg(lst):
        return sum(lst) / len(lst) if lst else 0

    def group_analysis(title, key, truthy_label, falsy_label, truthy_test):
        yes_prices = [l["price_pw"] for l in priced if truthy_test(l)]
        no_prices = [l["price_pw"] for l in priced if not truthy_test(l)]
        yes_avg = avg(yes_prices)
        no_avg = avg(no_prices)
        diff = yes_avg - no_avg
        lines.append(f"--- {title} ---")
        lines.append(f"  {truthy_label:20s}: n={len(yes_prices):2d}  avg=${yes_avg:.0f}/wk")
        lines.append(f"  {falsy_label:20s}: n={len(no_prices):2d}  avg=${no_avg:.0f}/wk")
        lines.append(f"  Premium: {'+' if diff >= 0 else ''}{diff:.0f}/wk")
        lines.append("")

    # Aircon premium
    group_analysis(
        "Air Conditioning", "has_aircon",
        "Has aircon", "No aircon",
        lambda l: l.get("has_aircon")
    )

    # Outdoor space premium
    group_analysis(
        "Outdoor Space", "outdoor_space",
        "Has outdoor space", "No outdoor space",
        lambda l: l.get("outdoor_space") != "none"
    )

    # Parking premium
    group_analysis(
        "Parking", "parking_spaces",
        "Has parking", "No parking",
        lambda l: (l.get("parking_spaces") or 0) > 0
    )

    # Floor level
    lines.append("--- Floor Level ---")
    levels = ["ground", "upper", "high", "unknown"]
    for lvl in levels:
        ps = [l["price_pw"] for l in priced if l.get("floor_level") == lvl]
        if ps:
            lines.append(f"  {lvl:12s}: n={len(ps):2d}  avg=${avg(ps):.0f}/wk")
    lines.append("")

    # Condition
    lines.append("--- Property Condition ---")
    for cond in ["new_renovated", "maintained", "dated"]:
        ps = [l["price_pw"] for l in priced if l.get("condition") == cond]
        if ps:
            lines.append(f"  {cond:15s}: n={len(ps):2d}  avg=${avg(ps):.0f}/wk")
    lines.append("")

    # Dishwasher
    group_analysis(
        "Dishwasher", "dishwasher",
        "Has dishwasher", "No dishwasher",
        lambda l: l.get("dishwasher")
    )

    # Outdoor space breakdown
    lines.append("--- Outdoor Space Type ---")
    for otype in ["balcony", "courtyard", "garden", "none"]:
        ps = [l["price_pw"] for l in priced if l.get("outdoor_space") == otype]
        if ps:
            lines.append(f"  {otype:12s}: n={len(ps):2d}  avg=${avg(ps):.0f}/wk")
    lines.append("")

    # Suburb averages
    lines.append("--- Suburb Averages ---")
    suburbs = sorted(set(l["suburb"] for l in priced))
    for sub in suburbs:
        ps = [l["price_pw"] for l in priced if l["suburb"] == sub]
        lines.append(f"  {sub:15s}: n={len(ps):2d}  avg=${avg(ps):.0f}/wk")
    lines.append("")

    return "\n".join(lines)


def main():
    all_listings = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="en-AU",
        )
        page = context.new_page()

        # Step 1: Get listings from search pages
        print("\n=== STEP 1: Extracting listing URLs from search pages ===\n")
        search_listings = []
        for sp in SEARCH_PAGES:
            found = scrape_search_page(page, sp["url"], sp["suburb"])
            search_listings.extend(found)
            time.sleep(2)

        # Combine: known listings + search-discovered listings
        # For northcote, we already have 1 known listing; skip duplicates from search
        known_northcote_url = "https://www.domain.com.au/1-11-mckean-street-northcote-vic-3070-18077652"

        # Filter search listings: skip northcote entries that duplicate our known one,
        # and limit northcote to 4 more (to total 5 with the known one)
        northcote_count = 1  # we already have 1 known
        filtered_search = []
        for sl in search_listings:
            if sl["suburb"] == "northcote":
                if sl["url"] == known_northcote_url:
                    continue
                if northcote_count >= 5:
                    continue
                northcote_count += 1
            filtered_search.append(sl)

        all_to_scrape = KNOWN_LISTINGS + filtered_search

        print(f"\nTotal listings to scrape: {len(all_to_scrape)}")

        # Step 2: Scrape each listing page
        print("\n=== STEP 2: Scraping individual listing pages ===\n")

        suburbs_seen = {}
        for item in all_to_scrape:
            suburb = item["suburb"]
            suburbs_seen[suburb] = suburbs_seen.get(suburb, 0) + 1

            result = scrape_listing(
                page,
                item["url"],
                suburb,
                known_price=item.get("price_pw"),
                known_parking=item.get("parking_spaces"),
            )
            if result:
                all_listings.append(result)

            time.sleep(2)

        browser.close()

    # Save results
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_listings, f, indent=2, default=str)

    print(f"\n=== RESULTS ===")
    print(f"Saved {len(all_listings)} listings to {OUTPUT_FILE}")

    # Run analysis
    analysis = run_analysis(all_listings)
    print("\n" + analysis)

    with open(ANALYSIS_FILE, "w") as f:
        f.write(analysis)

    print(f"Analysis saved to {ANALYSIS_FILE}")


if __name__ == "__main__":
    main()
