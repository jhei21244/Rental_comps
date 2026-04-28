/**
 * FairRent Domain Scraper — Cloudflare Worker
 * Uses fetch() to get Domain.com.au HTML + parses __NEXT_DATA__ for listing data.
 * No browser needed for search pages. Browser used only for individual listing descriptions.
 */
import puppeteer from "@cloudflare/puppeteer";

const CF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-AU,en;q=0.9",
};

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function parsePrice(text) {
  if (!text) return null;
  const m = text.match(/\$([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, '')) : null;
}

function parseParking(features) {
  if (!features) return 0;
  for (const f of features) {
    if (f.toLowerCase().includes('parking')) {
      const m = f.match(/(\d+)/);
      return m ? parseInt(m[1]) : 1;
    }
  }
  return 0;
}

function walkForListings(obj, depth = 0) {
  const results = [];
  if (depth > 10 || !obj) return results;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        if (item.listingModel || (item.price && item.address)) {
          results.push(item);
        } else {
          results.push(...walkForListings(item, depth + 1));
        }
      }
    }
  } else if (typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      results.push(...walkForListings(v, depth + 1));
    }
  }
  return results;
}

function parseListingFromModel(raw) {
  // Handle both {listingModel: {...}} and flat structures
  const m = raw.listingModel || raw;
  
  const priceText = m.price?.display || m.price || '';
  const price = parsePrice(typeof priceText === 'string' ? priceText : JSON.stringify(priceText));
  
  const features = m.features || m.propertyFeatures || [];
  const beds = features.find ? features.find(f => f?.type === 'bedrooms' || f?.label?.toLowerCase().includes('bed'))?.value : null;
  const baths = features.find ? features.find(f => f?.type === 'bathrooms' || f?.label?.toLowerCase().includes('bath'))?.value : null;
  const parking = features.find ? features.find(f => f?.type === 'parking' || f?.label?.toLowerCase().includes('park'))?.value : null;
  
  const addr = m.address || m.displayAddress || {};
  const suburb = typeof addr === 'string' ? addr : (addr.suburb || addr.displayType || '');
  
  const url = m.url || m.listingSlug || m.canonicalUrl || '';
  
  return { price, priceText: typeof priceText === 'string' ? priceText : '', suburb, beds, baths, parking, url, raw: m };
}

export default {
  async fetch(request, env) {
    const reqUrl = new URL(request.url);
    const mode = reqUrl.searchParams.get("mode") || "search";

    try {
      // ── SEARCH: fetch HTML, parse __NEXT_DATA__ for listing cards ──
      if (mode === "search") {
        const suburb = reqUrl.searchParams.get("suburb") || "brunswick-vic-3056";
        const beds = reqUrl.searchParams.get("beds") || "2";
        const pg = reqUrl.searchParams.get("page") || "1";
        
        let targetUrl = `https://www.domain.com.au/rent/${suburb}/?bedrooms=${beds}&property-type=apartments`;
        if (pg !== "1") targetUrl += `&page=${pg}`;
        
        const resp = await fetch(targetUrl, { headers: CF_HEADERS });
        const html = await resp.text();
        
        const nextData = extractNextData(html);
        let listings = [];
        
        if (nextData) {
          const rawListings = walkForListings(nextData);
          
          for (const raw of rawListings) {
            const m = raw.listingModel || raw;
            const priceDisplay = m.price?.display || m.price || '';
            const price = parsePrice(typeof priceDisplay === 'string' ? priceDisplay : '');
            if (!price) continue;
            
            // Extract features
            const features = m.features || [];
            const featureTexts = features.map ? features.map(f => {
              if (typeof f === 'string') return f;
              return `${f.value || f.count || ''} ${f.type || f.label || ''}`.trim();
            }) : [];
            
            const link = m.url ? `https://www.domain.com.au${m.url}` : '';
            
            listings.push({
              price: typeof priceDisplay === 'string' ? priceDisplay : `$${price} per week`,
              price_pw: price,
              link,
              features: featureTexts,
              beds: m.bedrooms || m.beds || null,
              baths: m.bathrooms || m.baths || null,
              parking_spaces: m.carSpaces || m.parking || parseParking(featureTexts),
              property_type: m.propertyType || m.listingType || null,
            });
          }
        }
        
        // If __NEXT_DATA__ parsing got nothing, try regex fallback on price tags
        if (listings.length === 0) {
          const priceMatches = [...html.matchAll(/"display":"(\$[\d,]+ (?:per week|pw|\/wk))"/g)];
          listings = priceMatches.slice(0, 20).map(m => ({ price: m[1], price_pw: parsePrice(m[1]) }));
        }
        
        return new Response(JSON.stringify({
          suburb, page: pg, status: resp.status,
          count: listings.length,
          hasNextData: !!nextData,
          listings,
        }), { headers: { "Content-Type": "application/json" }});
      }

      // ── LISTING: use browser to get full description ──
      if (mode === "listing") {
        const listingUrl = reqUrl.searchParams.get("url");
        if (!listingUrl) return new Response(JSON.stringify({ error: "url required" }), { status: 400 });

        // First try fetch() — some descriptions are in server-side HTML
        const resp = await fetch(listingUrl, { headers: CF_HEADERS });
        const html = await resp.text();
        
        // Try to extract description from HTML (often in __NEXT_DATA__)
        const nextData = extractNextData(html);
        let description = '';
        let address = '';
        
        if (nextData) {
          const str = JSON.stringify(nextData);
          // Look for description field
          const descMatch = str.match(/"description":"((?:[^"\\]|\\.)*)"/);
          if (descMatch) description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          
          const addrMatch = str.match(/"displayAddress":"((?:[^"\\]|\\.)*)"/);
          if (addrMatch) address = addrMatch[1];
        }
        
        // If no description found in HTML, fall back to browser
        if (!description) {
          const browser = await puppeteer.launch(env.BROWSER);
          const page = await browser.newPage();
          await page.setExtraHTTPHeaders(CF_HEADERS);
          try {
            await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
            await new Promise(r => setTimeout(r, 1500));
            await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Read more'); if(b) b.click(); });
            await new Promise(r => setTimeout(r, 400));
            description = await page.evaluate(() => document.querySelector('[data-testid="listing-details__description"]')?.innerText || '');
            address = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
          } finally {
            await browser.close();
          }
        }
        
        return new Response(JSON.stringify({ url: listingUrl, address, description }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: "Unknown mode. Use ?mode=search|listing" }), { status: 400 });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack?.slice(0,500) }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }
  }
};
