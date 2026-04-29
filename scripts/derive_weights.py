"""
derive_weights.py
=================
Runs an OLS hedonic regression to estimate $/week premiums for property
attributes, controlling for suburb via fixed effects.

Input:  data/listings_clean.json
Output: data/attribute_weights.json  (+ comparison table printed to stdout)

Requires: pandas, numpy, statsmodels

Usage:
    python scripts/derive_weights.py

KNOWN GAPS (Apr 2026)
---------------------
This script is materially out of sync with the live model in lib/model.ts.
Before treating its output as production-ready:

  1. Wiring: this reads `data/listings_clean.json` (output of parse_listings.py,
     which only sees card-level data). The richer attribute data in
     `data/all_listings_raw.json` (from collect_listings_v2.py) is never fed
     into the regression. A bridge script is needed.

  2. Vocabulary mismatch: collect_listings_v2 emits parking_type values like
     "lockup_garage", "undercover", "carport"; parse_listings collapses to
     "garage"/"undercover"/"street"/"none". The live model uses
     parking_lockup_garage / parking_undercover / parking_street.

  3. Unwired attributes (in lib/model.ts but not regressed here):
       - condition_new_build, condition_renovated, condition_dated, condition_poor
       - outdoor_courtyard_garden (currently lumped with balcony as has_outdoor)
       - internal_laundry, furnished
       - transport_lt5 / transport_5_10 / transport_10_15
         (cannot be derived from listings — requires a separate geocoding
          step against PTV stops + property address)

  4. Aircon estimates below are fabricated, not regressed: extract_weights()
     splits a single binary `has_aircon` coefficient in half to populate
     aircon_one_room and aircon_whole. The regression itself only has one AC
     regressor.

  5. Removed regressors still present here: `floor_mid`, `floor_upper`,
     `pets_allowed`. Floor and pets were dropped from the schema and the live
     model. Their columns will be NaN-heavy and pollute the fit.
"""

import json
import sys
from pathlib import Path

try:
    import numpy as np
    import pandas as pd
    import statsmodels.api as sm
except ImportError:
    print("Missing dependencies. Run:  pip install -r scripts/requirements.txt")
    sys.exit(1)

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "listings_clean.json"
OUTPUT_FILE = DATA_DIR / "attribute_weights.json"

# Current weights from lib/model.ts ATTRIBUTE_WEIGHTS — kept in sync so the
# comparison column reflects what's actually deployed. Update both together.
CURRENT_WEIGHTS = {
    "parking_street":             5,
    "parking_undercover":        40,
    "parking_lockup_garage":     52,
    "aircon_one_room":           10,
    "aircon_whole":              16,
    "transport_lt5":             35,
    "transport_5_10":            20,
    "transport_10_15":            8,
    "condition_new_build":       60,
    "condition_renovated":       47,
    "condition_dated":          -25,
    "condition_poor":           -40,
    "outdoor_balcony":           40,
    "outdoor_courtyard_garden":  55,
    "internal_laundry":          20,
    "furnished":                 80,
}


def build_feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """Build dummy-encoded feature matrix for OLS."""
    features = pd.DataFrame(index=df.index)

    # Suburb fixed effects (drop first to avoid multicollinearity)
    suburb_dummies = pd.get_dummies(df["suburb"], prefix="suburb", drop_first=True)
    features = pd.concat([features, suburb_dummies], axis=1)

    # Bedrooms (continuous — each extra bedroom adds X $/week)
    features["bedrooms"] = df["bedrooms"].astype(float)

    # Bathrooms
    features["bathrooms"] = df["bathrooms"].astype(float)

    # Parking dummies (reference = no parking)
    features["parking_street"] = (df["parking"] == "street").astype(int)
    features["parking_undercover"] = (df["parking"] == "undercover").astype(int)
    features["parking_garage"] = (df["parking"] == "garage").astype(int)

    # Air conditioning (reference = no aircon, i.e. has_aircon == False)
    # We only have a binary flag from the scraper; split into has/doesn't have
    features["has_aircon"] = df["has_aircon"].fillna(False).astype(int)

    # Outdoor space (reference = no outdoor space)
    features["has_outdoor"] = df["has_outdoor_space"].fillna(False).astype(int)
    features["outdoor_courtyard"] = (
        df["outdoor_type"].fillna("") == "courtyard"
    ).astype(int)
    # 'balcony' is the complement of courtyard within has_outdoor

    # Floor level (reference = ground)
    features["floor_mid"] = (df["floor_level"] == "mid").astype(int)
    features["floor_upper"] = (df["floor_level"] == "upper").astype(int)

    # Property type (reference = apartment)
    features["is_house"] = (df["property_type"] == "house").astype(int)
    features["is_townhouse"] = (df["property_type"] == "townhouse").astype(int)

    # Pets allowed
    features["pets_allowed"] = df["pets_allowed"].fillna(False).astype(int)

    return features.astype(float)


def run_regression(df: pd.DataFrame):
    features = build_feature_matrix(df)
    X = sm.add_constant(features)
    y = df["weekly_rent"].astype(float)

    # Drop rows with NaN in X
    mask = X.notna().all(axis=1) & y.notna()
    X = X[mask]
    y = y[mask]

    print(f"Running OLS on {len(y)} observations, {X.shape[1]} regressors …\n")
    model = sm.OLS(y, X).fit(cov_type="HC3")  # heteroskedasticity-robust SEs
    return model


def extract_weights(model) -> dict:
    """Map model coefficients to our attribute weight schema."""
    coef = model.params
    pval = model.pvalues

    def coef_val(name: str) -> float:
        return round(float(coef.get(name, 0)), 1)

    def sig(name: str) -> str:
        p = pval.get(name, 1.0)
        if p < 0.01:
            return "***"
        if p < 0.05:
            return "**"
        if p < 0.10:
            return "*"
        return ""

    # Map regression coefficients into the live model's attribute schema.
    # Keys with value None are NOT regressed by this script — see KNOWN GAPS
    # in the module docstring. Their estimates remain whatever lib/model.ts
    # has (literature priors); the comparison table prints "n/a" for them.
    weights: dict = {
        "parking_street":            coef_val("parking_street"),
        "parking_undercover":        coef_val("parking_undercover"),
        # build_feature_matrix uses "parking_garage" as the lockup-garage proxy
        "parking_lockup_garage":     coef_val("parking_garage"),
        # Aircon: only a binary regressor exists; cannot separate one-room vs whole
        "aircon_one_room":           None,
        "aircon_whole":              coef_val("has_aircon"),
        # Transit: not regressed (requires geocoding step)
        "transport_lt5":             None,
        "transport_5_10":            None,
        "transport_10_15":           None,
        # Condition: not regressed yet (needs v2 attribute data wired in)
        "condition_new_build":       None,
        "condition_renovated":       None,
        "condition_dated":           None,
        "condition_poor":            None,
        # Outdoor: has_outdoor is a single binary; treat as balcony equivalent
        "outdoor_balcony":           coef_val("has_outdoor"),
        "outdoor_courtyard_garden":  round(coef_val("has_outdoor") + coef_val("outdoor_courtyard"), 1),
        # Internal laundry / furnished: not regressed yet (needs v2 data)
        "internal_laundry":          None,
        "furnished":                 None,
    }

    return weights, sig


def main():
    if not INPUT_FILE.exists():
        print(f"Input file not found: {INPUT_FILE}")
        print("Run parse_listings.py first.")
        sys.exit(1)

    listings = json.loads(INPUT_FILE.read_text())
    df = pd.DataFrame(listings)
    print(f"Loaded {len(df)} clean listings\n")

    if len(df) < 30:
        print("Too few listings for a meaningful regression. "
              "Run fetch_domain_listings.py to collect more data.")
        sys.exit(1)

    model = run_regression(df)
    weights, sig_fn = extract_weights(model)

    print(f"R² = {model.rsquared:.3f}   Adj. R² = {model.rsquared_adj:.3f}")
    print(f"N  = {int(model.nobs)}\n")

    # -----------------------------------------------------------------------
    # Comparison table
    # -----------------------------------------------------------------------
    print("## Attribute Weight Comparison\n")
    print(
        f"| {'Attribute':<28} | {'Estimated $/wk':>16} | {'Sig':>4} | "
        f"{'Current (lib/model.ts)':>22} | {'Diff':>8} |"
    )
    print(f"|{'-'*30}|{'-'*18}|{'-'*6}|{'-'*24}|{'-'*10}|")

    attr_keys = list(CURRENT_WEIGHTS.keys())

    for key in attr_keys:
        est = weights.get(key)
        cur = CURRENT_WEIGHTS.get(key, 0)
        sig = sig_fn(key) if est is not None else ""
        if est is None:
            print(
                f"| {key:<28} | {'n/a (unwired)':>16} | {sig:>4} | "
                f"{cur:>+21} | {'—':>8} |"
            )
            continue
        diff = round(est - cur, 1)
        print(
            f"| {key:<28} | {est:>+15.1f} | {sig:>4} | "
            f"{cur:>+21} | {diff:>+8.1f} |"
        )

    print("\n*** p<0.01  ** p<0.05  * p<0.10\n")

    # -----------------------------------------------------------------------
    # Bedroom/bathroom/type coefficients (informational)
    # -----------------------------------------------------------------------
    coef = model.params
    print("## Other Coefficients\n")
    for name in ["bedrooms", "bathrooms", "is_house", "is_townhouse"]:
        if name in coef:
            print(f"  {name:<20} {coef[name]:>+8.1f} $/wk")

    # -----------------------------------------------------------------------
    # Save
    # -----------------------------------------------------------------------
    OUTPUT_FILE.write_text(json.dumps(weights, indent=2))
    print(f"\nSaved attribute weights → {OUTPUT_FILE}")

    # Also save full regression summary as text
    summary_file = DATA_DIR / "regression_summary.txt"
    summary_file.write_text(model.summary().as_text())
    print(f"Saved regression summary → {summary_file}")


if __name__ == "__main__":
    main()
