import type { PlaceResult } from '../types/scraper.ts';

export interface RawScraperRecord {
  longitude?: number;
  longtitude?: number;
  latitude?: number;
  input_id?: string;
  link?: string;
  cid?: string;
  title?: string;
  categories?: string[];
  category?: string;
  address?: string;
  open_hours?: Record<string, string[]>;
  popular_times?: Record<string, unknown>;
  web_site?: string;
  phone?: string;
  plus_code?: string;
  review_count?: number;
  review_rating?: number;
  reviews_per_rating?: Record<string, number>;
  status?: string;
  description?: string;
  reviews_link?: string;
  thumbnail?: string;
  timezone?: string;
  price_range?: string;
  data_id?: string;
  street_view_url?: string;
  place_id?: string;
  images?: string[];
  owner?: {
    id?: string;
    name?: string;
    link?: string;
  };
  complete_address?: {
    borough?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    state?: string;
    country?: string;
  };
  user_reviews?: Array<{
    Name?: string;
    ProfilePicture?: string;
    Rating?: number;
    Description?: string;
    When?: string;
    review_id?: string;
    source?: string;
  }>;
  emails?: string[] | string | null;
}

/**
 * Parses raw scraper JSON output (supporting both NDJSON / JSON lines and JSON arrays)
 */
export function parseScraperJsonOutput(rawContent: string, defaultQuery = 'Google Maps Search'): PlaceResult[] {
  if (!rawContent || !rawContent.trim()) return [];

  const results: PlaceResult[] = [];
  const trimmed = rawContent.trim();

  // Try parsing as standard JSON array first
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsedArray = JSON.parse(trimmed);
      if (Array.isArray(parsedArray)) {
        return parsedArray.map((raw, idx) => mapRawToPlaceResult(raw, idx, defaultQuery));
      }
    } catch {
      // Fallback to line by line parsing
    }
  }

  // Parse line-by-line NDJSON (as output by google_maps_scraper with -json flag)
  const lines = trimmed.split('\n');
  lines.forEach((line, index) => {
    const l = line.trim();
    if (!l) return;
    try {
      const raw = JSON.parse(l);
      if (raw && (raw.title || raw.place_id || raw.cid || raw.latitude)) {
        results.push(mapRawToPlaceResult(raw, index, defaultQuery));
      }
    } catch {
      // skip invalid line
    }
  });

  return results;
}

function mapRawToPlaceResult(raw: RawScraperRecord, index: number, query: string): PlaceResult {
  const lat = raw.latitude ?? 0;
  const lng = raw.longitude ?? raw.longtitude ?? 0;

  // Extract email: check emails array/string or fallback from website domain
  let email = '';
  if (Array.isArray(raw.emails) && raw.emails.length > 0) {
    email = raw.emails[0];
  } else if (typeof raw.emails === 'string' && raw.emails.trim()) {
    email = raw.emails.trim();
  } else if (raw.web_site) {
    try {
      const url = new URL(raw.web_site.startsWith('http') ? raw.web_site : `http://${raw.web_site}`);
      const domain = url.hostname.replace(/^www\./, '');
      if (domain && domain.includes('.')) {
        email = `info@${domain}`;
      }
    } catch {
      // ignore
    }
  }

  // Categories
  const category = raw.category || (raw.categories && raw.categories[0]) || 'Business';
  const categoriesList = raw.categories || [category];

  // Address
  const fullAddress = raw.address || [
    raw.complete_address?.street,
    raw.complete_address?.borough,
    raw.complete_address?.city,
    raw.complete_address?.postal_code,
    raw.complete_address?.country
  ].filter(Boolean).join(', ');

  const city = raw.complete_address?.city || (fullAddress.includes('Lahore') ? 'Lahore' : 'Target City');
  const country = raw.complete_address?.country === 'PK' ? 'Pakistan' : (raw.complete_address?.country || 'Pakistan');

  // Open hours formatted
  const hoursMap: Record<string, string> = {};
  if (raw.open_hours) {
    for (const [day, slots] of Object.entries(raw.open_hours)) {
      hoursMap[day] = Array.isArray(slots) ? slots.join(', ') : String(slots);
    }
  }

  // Top review snippet
  let reviewSnippet = '';
  if (raw.user_reviews && raw.user_reviews.length > 0) {
    const top = raw.user_reviews[0];
    if (top.Description) {
      reviewSnippet = top.Description;
    }
  }

  return {
    id: raw.cid || raw.place_id || `place_${index}_${Date.now()}`,
    title: raw.title || 'Untitled Business',
    category,
    categories: categoriesList,
    rating: typeof raw.review_rating === 'number' ? Number(raw.review_rating.toFixed(1)) : 4.5,
    reviews: raw.review_count ?? (raw.user_reviews ? raw.user_reviews.length : 0),
    phone: raw.phone || '',
    email,
    website: raw.web_site || '',
    address: fullAddress,
    city,
    country,
    latitude: lat,
    longitude: lng,
    plusCode: raw.plus_code || '',
    priceLevel: raw.price_range || '$$',
    isOpen: !!raw.open_hours,
    hours: hoursMap,
    open_hours_raw: raw.open_hours,
    googleMapsUrl: raw.link || (raw.cid ? `https://maps.google.com/?cid=${raw.cid}` : (lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : (raw.title ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${raw.title} ${fullAddress}`.trim())}` : ''))),
    cid: raw.cid || '',
    placeId: raw.place_id || '',
    thumbnail: raw.thumbnail || '',
    images: raw.images || [],
    scrapedAt: new Date().toISOString(),
    searchQuery: query,
    reviewSnippet,
    user_reviews: raw.user_reviews || [],
    reviews_per_rating: raw.reviews_per_rating,
    complete_address: raw.complete_address,
    timezone: raw.timezone || 'Asia/Karachi',
    owner: raw.owner,
  };
}
