"""
fetch_domain_listings.py
========================
Collects rental listings from Domain.com.au for target Melbourne suburbs.

Supports two modes:
  1. Domain Developer API  — set DOMAIN_CLIENT_ID + DOMAIN_CLIENT_SECRET env vars
  2. Web scraper fallback  — works without credentials; reads __NEXT_DATA__ JSON
     embedded in Domain's Next.js pages.

Output: data/domain_listings_raw.json

Usage:
    python scripts/fetch_domain_listings.py [--suburbs brunswick fitzroy ...]
                                             [--bedrooms 2]
                                             [--pages 5]
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Target suburbs with their Domain URL slugs and postcodes
# ---------------------------------------------------------------------------
SUBURB_CONFIG = {
    "brunswick":    {"slug": "brunswick-vic-3056",     "postcode": "3056"},
    "fitzroy":      {"slug": "fitzroy-vic-3065",        "postcode": "3065"},
    "northcote":    {"slug": "northcote-vic-3070",      "postcode": "3070"},
    "collingwood":  {"slug": "collingwood-vic-3066",    "postcode": "3066"},
    "richmond":     {"slug": "richmond-vic-3121",       "postcode": "3121"},
    "st-kilda":     {"slug": "st-kilda-vic-3182",       "postcode": "3182"},
    "prahran":      {"slug": "prahran-vic-3181",        "postcode": "3181"},
    "carlton":      {"slug": "carlton-vic-3053",        "postcode": "3053"},
}

DEFAULT_SUBURBS = list(SUBURB_CONFIG.keys())

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "domain_listings_raw.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-AU,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

REQUEST_DELAY = 2.5  # seconds between requests — be respectful


# ---------------------------------------------------------------------------
# Domain Developer API mode
# ---------------------------------------------------------------------------

def get_api_token(client_id: str, client_secret: str) -> str:
    resp = requests.post(
        "https://auth.domain.com.au/v1/connect/token",
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "api_listings_read",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def fetch_via_api(suburbs: list[str], bedrooms: int, max_pages: int) -> list[dict]:
    client_id = os.environ["DOMAIN_CLIENT_ID"]
    client_secret = os.environ["DOMAIN_CLIENT_SECRET"]
    print("Using Domain Developer API …")
    token = get_api_token(client_id, client_secret)
    auth_header = {"Authorization": f"Bearer {token}"}

    all_listings: list[dict] = []

    for suburb_key in suburbs:
        cfg = SUBURB_CONFIG.get(suburb_key)
        if not cfg:
            print(f"  [SKIP] Unknown suburb key: {suburb_key}")
            continue

        suburb_display = suburb_key.replace("-", " ").title()
        print(f"  Fetching {suburb_display} …")

        for page in range(1, max_pages + 1):
            payload = {
                "listingType": "Rent",
                "propertyTypes": ["ApartmentUnitFlat", "Townhouse", "House"],
                "minBedrooms": bedrooms,
                "maxBedrooms": bedrooms,
                "locations": [
                    {
                        "state": "VIC",
                        "suburb": suburb_key.replace("-", " ").title().replace(" ", ""),
                        "postCode": cfg["postcode"],
                        "includeSurroundingSuburbs": False,
                    }
                ],
                "pageSize": 50,
                "page": page,
            }

            resp = requests.post(
                "https://api.domain.com.au/v1/listings/residential/_search",
                json=payload,
                headers={**HEADERS, **auth_header},
                timeout=20,
            )

            if resp.status_code == 204 or not resp.text:
                break  # no more results

            resp.raise_for_status()
            results = resp.json()

            if not results:
                break

            for item in results:
                listing = item.get("listing", item)
                listing["_suburb_key"] = suburb_key
                all_listings.append(listing)

            print(f"    page {page}: {len(results)} listings (total so far: {len(all_listings)})")
            time.sleep(REQUEST_DELAY)

    return all_listings


# ---------------------------------------------------------------------------
# Web scraper fallback (reads __NEXT_DATA__ embedded JSON)
# ---------------------------------------------------------------------------

def _extract_next_data(html: str) -> dict | None:
    """Extract the __NEXT_DATA__ JSON blob from a Next.js page."""
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("script", {"id": "__NEXT_DATA__"})
    if tag and tag.string:
        try:
            return json.loads(tag.string)
        except json.JSONDecodeError:
            pass
    return None


def _extract_listings_from_next_data(data: dict) -> list[dict]:
    """
    Walk the Next.js page props to find the listings array.
    Domain's structure changes occasionally; this tries several known paths.
    """
    listings: list[dict] = []

    def walk(obj, depth=0):
        if depth > 8:
            return
        if isinstance(obj, list):
            for item in obj:
                # Listings typically have a 'listingModel' or 'id' + 'price' key
                if isinstance(item, dict):
                    if "listingModel" in item or (
                        "price" in item and "address" in item
                    ):
                        listings.append(item)
                    else:
                        walk(item, depth + 1)
        elif isinstance(obj, dict):
            for v in obj.values():
                walk(v, depth + 1)

    walk(data)
    return listings


def _parse_listing_card(card) -> dict | None:
    """Fallback: parse a listing <article> card from HTML."""
    try:
        data: dict = {}

        # Price
        price_el = card.select_one("[data-testid='listing-card-price']")
        if not price_el:
            price_el = card.select_one(".css-mgq8yx")  # common class
        data["price_text"] = price_el.get_text(strip=True) if price_el else ""

        # Address
        addr_el = card.select_one("[data-testid='listing-card-address']")
        if not addr_el:
            addr_el = card.select_one("h2")
        data["address"] = addr_el.get_text(strip=True) if addr_el else ""

        # Features (beds / baths / parking)
        features_el = card.select("[data-testid='property-features-text-container']")
        for f in features_el:
            text = f.get_text(strip=True).lower()
            if "bed" in text:
                data["bedrooms_text"] = text
            elif "bath" in text:
                data["bathrooms_text"] = text
            elif "park" in text or "car" in text:
                data["parking_text"] = text

        # Property type tag
        type_el = card.select_one("[data-testid='listing-card-property-type']")
        data["property_type_text"] = type_el.get_text(strip=True) if type_el else ""

        # Listing URL (may contain listing ID)
        link_el = card.select_one("a[href*='/rent/']")
        data["url"] = link_el["href"] if link_el else ""

        return data if data.get("price_text") or data.get("address") else None

    except Exception:
        return None


def fetch_suburb_page(suburb_slug: str, bedrooms: int, page: int) -> tuple[list[dict], bool]:
    """
    Fetch one page of Domain search results for a suburb.
    Returns (listings, has_more).
    """
    # Domain paginates via ?page=N (1-indexed)
    url = (
        f"https://www.domain.com.au/rent/{suburb_slug}/"
        f"?bedrooms={bedrooms}&property-type=apartments%2Ctownhouses%2Chouses"
    )
    if page > 1:
        url += f"&page={page}"

    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()

    # Try __NEXT_DATA__ first (fastest, most structured)
    next_data = _extract_next_data(resp.text)
    if next_data:
        listings = _extract_listings_from_next_data(next_data)
        if listings:
            # Check for pagination info in next_data
            props = next_data.get("props", {}).get("pageProps", {})
            total_count = (
                props.get("totalCount")
                or props.get("searchResults", {}).get("totalCount")
                or props.get("listingsCount")
            )
            if total_count:
                has_more = page * 50 < int(total_count)
            else:
                has_more = len(listings) >= 20  # assume more if full page
            return listings, has_more

    # Fallback: HTML card parsing
    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select("article[data-testid='listing-card-wrapper-premiumplus'], "
                        "article[data-testid='listing-card-wrapper-standard'], "
                        "article[class*='listing-card']")

    parsed = []
    for card in cards:
        result = _parse_listing_card(card)
        if result:
            parsed.append(result)

    has_more = len(parsed) >= 20
    return parsed, has_more


def fetch_via_scraper(suburbs: list[str], bedrooms: int, max_pages: int) -> list[dict]:
    print("No API credentials found — using web scraper …")
    print("(Be respectful: requests are throttled to one every "
          f"{REQUEST_DELAY}s)\n")

    all_listings: list[dict] = []

    for suburb_key in suburbs:
        cfg = SUBURB_CONFIG.get(suburb_key)
        if not cfg:
            print(f"  [SKIP] Unknown suburb: {suburb_key}")
            continue

        suburb_slug = cfg["slug"]
        suburb_display = suburb_key.replace("-", " ").title()
        print(f"  Scraping {suburb_display} ({suburb_slug}) …")

        suburb_total = 0
        for page in range(1, max_pages + 1):
            try:
                listings, has_more = fetch_suburb_page(suburb_slug, bedrooms, page)
            except requests.HTTPError as e:
                print(f"    HTTP {e.response.status_code} on page {page} — stopping this suburb")
                break
            except Exception as e:
                print(f"    Error on page {page}: {e} — stopping this suburb")
                break

            if not listings:
                print(f"    page {page}: no listings found — stopping")
                break

            # Tag each listing with metadata
            for listing in listings:
                if isinstance(listing, dict):
                    listing["_suburb_key"] = suburb_key
                    listing["_bedrooms_requested"] = bedrooms
                    listing["_page"] = page
                    listing["_source"] = "scraper"

            all_listings.extend(listings)
            suburb_total += len(listings)
            print(f"    page {page}: {len(listings)} listings "
                  f"(suburb total: {suburb_total})")

            if not has_more:
                break

            time.sleep(REQUEST_DELAY)

        print(f"  {suburb_display}: {suburb_total} listings collected\n")
        time.sleep(REQUEST_DELAY)

    return all_listings


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Fetch Domain.com.au rental listings")
    parser.add_argument(
        "--suburbs",
        nargs="+",
        default=DEFAULT_SUBURBS,
        help="Suburb keys to fetch (default: all 8 launch suburbs)",
    )
    parser.add_argument(
        "--bedrooms",
        type=int,
        default=2,
        help="Number of bedrooms to filter by (default: 2)",
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=5,
        help="Max pages to fetch per suburb (50 results/page; default: 5 = 250 max)",
    )
    args = parser.parse_args()

    DATA_DIR.mkdir(exist_ok=True)

    has_api_creds = bool(
        os.environ.get("DOMAIN_CLIENT_ID") and os.environ.get("DOMAIN_CLIENT_SECRET")
    )

    print(f"Target suburbs: {', '.join(args.suburbs)}")
    print(f"Bedrooms: {args.bedrooms}, Max pages: {args.pages}")
    print()

    if has_api_creds:
        listings = fetch_via_api(args.suburbs, args.bedrooms, args.pages)
    else:
        listings = fetch_via_scraper(args.suburbs, args.bedrooms, args.pages)

    if not listings:
        print("\nNo listings collected. Check your suburb names and network access.")
        sys.exit(1)

    OUTPUT_FILE.write_text(json.dumps(listings, indent=2, default=str))
    print(f"\nSaved {len(listings)} raw listings → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
