"""
parse_listings.py
=================
Normalises raw Domain.com.au listing data (from fetch_domain_listings.py)
into a clean, consistent schema.

Input:  data/domain_listings_raw.json
Output: data/listings_clean.json

Usage:
    python scripts/parse_listings.py
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "domain_listings_raw.json"
OUTPUT_FILE = DATA_DIR / "listings_clean.json"

SUBURB_DISPLAY = {
    "brunswick":   "Brunswick",
    "fitzroy":     "Fitzroy",
    "northcote":   "Northcote",
    "collingwood": "Collingwood",
    "richmond":    "Richmond",
    "st-kilda":    "St Kilda",
    "prahran":     "Prahran",
    "carlton":     "Carlton",
}


# ---------------------------------------------------------------------------
# Price parsing
# ---------------------------------------------------------------------------

def parse_weekly_rent(price_text: str) -> int | None:
    """
    Extract a weekly rent integer from a price string.
    Handles formats like:
      "$520 per week", "$520 pw", "$520/w", "$2,250/month"
    Returns None if parsing fails or if price looks like a per-month figure.
    """
    if not price_text:
        return None

    text = price_text.lower().strip()

    # Skip ranges/prices that don't mention rent
    if any(x in text for x in ["price withheld", "contact", "apply"]):
        return None

    # Extract the number
    numbers = re.findall(r"[\d,]+", text)
    if not numbers:
        return None

    amount = int(numbers[0].replace(",", ""))

    # Convert monthly to weekly
    if "month" in text or "/mo" in text or "pcm" in text:
        amount = round(amount * 12 / 52)

    # Sanity check: Melbourne rents $150–$3000/week
    if amount < 150 or amount > 3000:
        return None

    return amount


# ---------------------------------------------------------------------------
# Bedroom / bathroom / parking parsing
# ---------------------------------------------------------------------------

def parse_int_from_text(text: str) -> int | None:
    if not text:
        return None
    m = re.search(r"\d+", text)
    return int(m.group()) if m else None


def parse_parking(text: str) -> str | None:
    """Returns 'none', 'street', 'undercover', or 'garage'."""
    if not text:
        return None
    t = text.lower()
    if "garage" in t or "lock-up" in t or "lock up" in t:
        return "garage"
    if "undercover" in t or "covered" in t or "basement" in t or "carport" in t:
        return "undercover"
    if "car" in t or "park" in t or "space" in t:
        return "street"
    return "none"


# ---------------------------------------------------------------------------
# Property type normalisation
# ---------------------------------------------------------------------------

PROPERTY_TYPE_MAP = {
    "ApartmentUnitFlat": "apartment",
    "Apartment": "apartment",
    "apartment": "apartment",
    "unit": "apartment",
    "flat": "apartment",
    "Townhouse": "townhouse",
    "townhouse": "townhouse",
    "House": "house",
    "house": "house",
    "Studio": "apartment",
    "studio": "apartment",
    "DuplexSemiDetached": "house",
    "Terrace": "house",
}


def normalise_property_type(raw: str) -> str:
    if not raw:
        return "apartment"
    for key, val in PROPERTY_TYPE_MAP.items():
        if key.lower() in raw.lower():
            return val
    return "apartment"


# ---------------------------------------------------------------------------
# Feature extraction (aircon, outdoor, floor level, pets)
# ---------------------------------------------------------------------------

def extract_features(raw: dict) -> dict:
    """
    Try to extract feature flags from various locations in the raw listing dict.
    Works for both API response format and scraper formats.
    """
    result = {
        "has_aircon": None,
        "has_outdoor_space": None,
        "outdoor_type": None,
        "floor_level": None,
        "pets_allowed": None,
    }

    # Collect all text we can search through
    text_blobs: list[str] = []

    for key in ("features", "propertyFeatures", "highlights", "tags", "description"):
        val = raw.get(key)
        if isinstance(val, list):
            text_blobs.extend([str(v) for v in val])
        elif isinstance(val, str):
            text_blobs.append(val)

    # Also check listingModel sub-dict (API format)
    listing_model = raw.get("listingModel", {})
    if isinstance(listing_model, dict):
        for key in ("features", "propertyFeatures", "highlights", "tags"):
            val = listing_model.get(key)
            if isinstance(val, list):
                text_blobs.extend([str(v) for v in val])
            elif isinstance(val, str):
                text_blobs.append(val)

    combined = " ".join(text_blobs).lower()

    # Air con
    if any(x in combined for x in ["air con", "aircon", "air conditioning", "ducted", "split system"]):
        result["has_aircon"] = True
    elif combined:
        result["has_aircon"] = False

    # Outdoor
    if "courtyard" in combined or "garden" in combined:
        result["has_outdoor_space"] = True
        result["outdoor_type"] = "courtyard"
    elif "balcony" in combined or "terrace" in combined or "deck" in combined:
        result["has_outdoor_space"] = True
        result["outdoor_type"] = "balcony"
    elif combined:
        result["has_outdoor_space"] = False

    # Floor level (look for "level X", "floor X", "Xth floor")
    floor_m = re.search(r"(?:floor|level)\s*(\d+)", combined)
    if floor_m:
        floor_num = int(floor_m.group(1))
        result["floor_level"] = "upper" if floor_num >= 4 else "mid" if floor_num >= 1 else "ground"
    elif "ground floor" in combined or "ground level" in combined:
        result["floor_level"] = "ground"

    # Pets
    if "pet" in combined:
        if any(x in combined for x in ["pets allowed", "pet friendly", "pets ok", "pets considered"]):
            result["pets_allowed"] = True
        elif any(x in combined for x in ["no pet", "pets not", "sorry no pet"]):
            result["pets_allowed"] = False

    return result


# ---------------------------------------------------------------------------
# Main normalisation
# ---------------------------------------------------------------------------

def normalise_listing(raw: dict) -> dict | None:
    suburb_key = raw.get("_suburb_key", "")
    suburb = SUBURB_DISPLAY.get(suburb_key, suburb_key.replace("-", " ").title())

    # --- Price ---
    # API format
    price_text = (
        raw.get("priceDetails", {}).get("displayPrice", "")
        or raw.get("price", {}).get("displayPrice", "")
        or raw.get("price_text", "")
        or str(raw.get("listingModel", {}).get("price", ""))
        or str(raw.get("price", ""))
    )
    weekly_rent = parse_weekly_rent(price_text)
    if weekly_rent is None:
        return None  # Cannot use listing without a usable rent

    # --- Property type ---
    prop_type_raw = (
        raw.get("propertyType", "")
        or raw.get("property_type_text", "")
        or raw.get("listingModel", {}).get("propertyType", "")
        or raw.get("propertyDetails", {}).get("propertyType", "")
    )
    property_type = normalise_property_type(prop_type_raw)

    # --- Bedrooms ---
    bedrooms = (
        raw.get("bedrooms")
        or raw.get("listingModel", {}).get("beds")
        or raw.get("propertyDetails", {}).get("bedrooms")
        or parse_int_from_text(raw.get("bedrooms_text", ""))
        or raw.get("_bedrooms_requested")
        or 2
    )
    try:
        bedrooms = int(bedrooms)
    except (TypeError, ValueError):
        bedrooms = 2

    # --- Bathrooms ---
    bathrooms = (
        raw.get("bathrooms")
        or raw.get("listingModel", {}).get("baths")
        or raw.get("propertyDetails", {}).get("bathrooms")
        or parse_int_from_text(raw.get("bathrooms_text", ""))
        or 1
    )
    try:
        bathrooms = int(bathrooms)
    except (TypeError, ValueError):
        bathrooms = 1

    # --- Parking ---
    parking_count = (
        raw.get("parkingSpaces")
        or raw.get("listingModel", {}).get("parking")
        or raw.get("propertyDetails", {}).get("carspaces")
        or parse_int_from_text(raw.get("parking_text", ""))
    )
    parking_type_raw = (
        raw.get("garageSpaces", 0) and "garage"
        or raw.get("carports", 0) and "undercover"
        or raw.get("parking_text", "")
    )
    parking = parse_parking(str(parking_type_raw)) if parking_type_raw else (
        "undercover" if (parking_count or 0) > 0 else "none"
    )

    # --- Address ---
    address = (
        raw.get("address", {}) if isinstance(raw.get("address"), dict) else {}
    )
    if isinstance(address, dict):
        street = address.get("street", "") or address.get("displayAddress", "")
    else:
        street = str(raw.get("address", ""))

    if not street:
        street = raw.get("listingModel", {}).get("address", {})
        if isinstance(street, dict):
            street = street.get("street", "")
        elif not isinstance(street, str):
            street = ""

    # --- Features ---
    features = extract_features(raw)

    return {
        "suburb": suburb,
        "property_type": property_type,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "weekly_rent": weekly_rent,
        "parking": parking,
        "has_aircon": features["has_aircon"],
        "has_outdoor_space": features["has_outdoor_space"],
        "outdoor_type": features["outdoor_type"],
        "floor_level": features["floor_level"],
        "pets_allowed": features["pets_allowed"],
        "address": street,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    if not INPUT_FILE.exists():
        print(f"Input file not found: {INPUT_FILE}")
        print("Run fetch_domain_listings.py first.")
        sys.exit(1)

    raw_listings = json.loads(INPUT_FILE.read_text())
    print(f"Loaded {len(raw_listings)} raw listings from {INPUT_FILE}")

    clean: list[dict] = []
    skipped = 0

    for raw in raw_listings:
        result = normalise_listing(raw)
        if result is None:
            skipped += 1
        else:
            clean.append(result)

    print(f"Parsed: {len(clean)} valid | {skipped} skipped (missing/unparseable price)\n")

    # Summary table
    suburb_stats: dict[str, list[int]] = defaultdict(list)
    for listing in clean:
        suburb_stats[listing["suburb"]].append(listing["weekly_rent"])

    print(f"{'Suburb':<20} {'Count':>6} {'Min':>6} {'Median':>8} {'Max':>6}")
    print("-" * 52)
    for suburb, rents in sorted(suburb_stats.items()):
        rents.sort()
        median = rents[len(rents) // 2]
        print(f"{suburb:<20} {len(rents):>6} {min(rents):>6} {median:>8} {max(rents):>6}")

    OUTPUT_FILE.write_text(json.dumps(clean, indent=2))
    print(f"\nSaved {len(clean)} clean listings → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
