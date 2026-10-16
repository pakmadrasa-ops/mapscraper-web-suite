import { LogLine, PlaceResult, ScraperFlags } from '../types/scraper';

interface CityGeo {
  name: string;
  lat: number;
  lng: number;
  country: string;
  phoneCode: string;
  emailDomain: string;
}

const KNOWN_CITIES: Record<string, CityGeo> = {
  lahore: { name: 'Lahore', lat: 31.5204, lng: 74.3587, country: 'Pakistan', phoneCode: '+92 42', emailDomain: '.pk' },
  karachi: { name: 'Karachi', lat: 24.8607, lng: 67.0011, country: 'Pakistan', phoneCode: '+92 21', emailDomain: '.pk' },
  islamabad: { name: 'Islamabad', lat: 33.6844, lng: 73.0479, country: 'Pakistan', phoneCode: '+92 51', emailDomain: '.pk' },
  dubai: { name: 'Dubai', lat: 25.2048, lng: 55.2708, country: 'United Arab Emirates', phoneCode: '+971 4', emailDomain: '.ae' },
  london: { name: 'London', lat: 51.5074, lng: -0.1278, country: 'United Kingdom', phoneCode: '+44 20', emailDomain: '.co.uk' },
  newyork: { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'United States', phoneCode: '+1 212', emailDomain: '.com' },
  sanfrancisco: { name: 'San Francisco', lat: 37.7749, lng: -122.4194, country: 'United States', phoneCode: '+1 415', emailDomain: '.com' },
};

function detectCityFromQueryOrGeo(query: string, geoStr?: string): CityGeo {
  const q = query.toLowerCase();
  for (const [key, city] of Object.entries(KNOWN_CITIES)) {
    if (q.includes(key) || q.includes(city.name.toLowerCase())) {
      return city;
    }
  }

  // Parse geo coordinates if provided
  if (geoStr && geoStr.includes(',')) {
    const [latStr, lngStr] = geoStr.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(latStr) && !isNaN(lngStr)) {
      if (latStr > 23 && latStr < 37 && lngStr > 60 && lngStr < 78) {
        return { name: 'Lahore', lat: latStr, lng: lngStr, country: 'Pakistan', phoneCode: '+92', emailDomain: '.pk' };
      }
      if (latStr > 24 && latStr < 26 && lngStr > 54 && lngStr < 56) {
        return { name: 'Dubai', lat: latStr, lng: lngStr, country: 'UAE', phoneCode: '+971', emailDomain: '.ae' };
      }
      if (latStr > 50 && latStr < 55 && lngStr > -1 && lngStr < 1) {
        return { name: 'London', lat: latStr, lng: lngStr, country: 'UK', phoneCode: '+44', emailDomain: '.co.uk' };
      }
      return { name: 'Target Area', lat: latStr, lng: lngStr, country: 'Global', phoneCode: '+1', emailDomain: '.com' };
    }
  }

  return KNOWN_CITIES.lahore;
}

const BUSINESS_TEMPLATES: Record<string, { categories: string[]; names: string[]; domains: string[] }> = {
  tech: {
    categories: ['Software Company', 'IT Services & IT Consulting', 'Web Development Agency', 'AI Solutions', 'Mobile App Development'],
    names: [
      'Techlogix Global', 'Systems Dynamic Labs', 'Devsinc Innovations', 'Netsol Matrix Tech', 'AlphaByte Softwares',
      'Cognitive Pixels IT', 'Inovio Cloud Solutions', 'Apex Stack Digital', 'Quantum Leap Infotech', 'VentureDive Tech Hub',
      '10Pearls Digital Studio', 'Nextbridge Enterprise', 'PureLogics Web Agency', 'Arbisoft Engineering', 'Folio3 Mobile Studio'
    ],
    domains: ['techlogix', 'devsinc', 'netsolmatrix', 'alphabyte', 'cognitivepixels', 'inoviosoft', 'apexstack', 'quantumleap', 'venturedive', 'purelogics']
  },
  dental: {
    categories: ['Dentist', 'Dental Clinic', 'Orthodontist', 'Dental Laboratory', 'Cosmetic Dentist'],
    names: [
      'SmileCare Dental Clinic', 'Pearl White Smiles Specialist', 'Apex Orthodontics & Implants', 'Gulberg Dental Surgery',
      'The Dental Lounge & Spa', 'City Dental Excellence', 'Gentle Dental Associates', 'Modern Ortho Studio',
      'Elite Dental & Maxillofacial', 'Care & Cure Dental Hospital', 'Radiant Smile Care', 'Family Dental Practice'
    ],
    domains: ['smilecaredental', 'pearlwhitesmiles', 'apexortho', 'gulbergdental', 'dentalloungespa', 'citydentalcare', 'radiantsmiles']
  },
  restaurant: {
    categories: ['Restaurant', 'Fine Dining', 'Cafe & Bistro', 'Italian Restaurant', 'Barbecue Restaurant', 'Continental Cuisine'],
    names: [
      'Monal Scenic Terrace', 'Haveli Heritage Rooftop', 'Cafe Aylanto Bistro', 'Arcadian Cafe Lounge',
      'Salt’n Pepper Village', 'Spice Bazaar Traditional Dining', 'CoCo Bistro & Grill', 'The Urban Table',
      'Veranda Italian Osteria', 'LalQila Authentic Grill', 'Bundu Khan BBQ', 'Howdy Gourmet Steaks'
    ],
    domains: ['monalrooftop', 'haveliheritage', 'cafeaylanto', 'arcadiancafe', 'spicebazaar', 'urbanflavour', 'verandaosteria']
  },
  law: {
    categories: ['Law Firm', 'Corporate Attorney', 'Legal Services', 'Tax Consultant', 'Patent Attorney'],
    names: [
      'Chambers & Partners Advocates', 'Justice League Law Associates', 'Prime Corporate Counsel', 'Apex Tax & Legal Advocates',
      'High Court Legal Barristers', 'Global IP & Trademark Attorneys', 'Lexicon Corporate Partners'
    ],
    domains: ['chambersadvocates', 'primecounsel', 'apextaxlaw', 'lexiconpartners', 'globalipattorneys']
  },
  general: {
    categories: ['Commercial Business', 'Consultancy Service', 'Professional Services', 'Corporate Office', 'Retail Enterprise'],
    names: [
      'Crestview Enterprises', 'Summit Global Solutions', 'Vanguard Business Center', 'Pinnacle Trade Partners',
      'Alliance Group International', 'Meridian Operations', 'Horizon Commercial Hub', 'Nova Commerce Ltd'
    ],
    domains: ['crestview', 'summitglobal', 'vanguardcenter', 'pinnaclepartners', 'alliancegroup', 'meridianops']
  }
};

function getTemplateForQuery(query: string) {
  const q = query.toLowerCase();
  if (q.includes('soft') || q.includes('tech') || q.includes('it') || q.includes('dev') || q.includes('web') || q.includes('app') || q.includes('ai')) {
    return BUSINESS_TEMPLATES.tech;
  }
  if (q.includes('dent') || q.includes('tooth') || q.includes('ortho') || q.includes('doctor') || q.includes('clinic')) {
    return BUSINESS_TEMPLATES.dental;
  }
  if (q.includes('cafe') || q.includes('rest') || q.includes('food') || q.includes('dine') || q.includes('bbq') || q.includes('coffee')) {
    return BUSINESS_TEMPLATES.restaurant;
  }
  if (q.includes('law') || q.includes('legal') || q.includes('attorney') || q.includes('advocate') || q.includes('tax')) {
    return BUSINESS_TEMPLATES.law;
  }
  return BUSINESS_TEMPLATES.general;
}

export async function runScrapingSimulation(
  flags: ScraperFlags,
  onLog: (line: LogLine) => void,
  onProgress: (progress: number, scrapedCount: number, emailsCount: number) => void,
  onResultsBatch: (batch: PlaceResult[]) => void,
  isCancelled: () => boolean
): Promise<PlaceResult[]> {
  const timestamp = () => new Date().toLocaleTimeString();

  const addLog = (level: LogLine['level'], message: string) => {
    onLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timestamp(),
      level,
      message,
    });
  };

  const queries = flags.input
    .split('\n')
    .map(q => q.trim())
    .filter(Boolean);

  if (queries.length === 0) {
    queries.push('Businesses');
  }

  addLog('info', `[INIT] Google Maps Scraper v1.18.1 (Go runtime: linux/amd64)`);
  addLog('info', `[CONFIG] Concurrency: -c ${flags.c} | Depth: -depth ${flags.depth} | Timeout: -exit-on-inactivity ${flags.exitOnInactivity}`);
  
  if (flags.useGrid) {
    addLog('info', `[SPATIAL] Grid bounding box mode: -grid-bbox '${flags.gridBbox}' cell=${flags.gridCell}km`);
  } else {
    addLog('info', `[SPATIAL] Geo coordinates: -geo '${flags.geo}' | Radius: ${flags.radius}m | Zoom: ${flags.zoom}`);
  }

  if (flags.email) {
    addLog('info', `[EXTRACTION] Website crawler enabled (-email): Extracts email addresses from homepages & contact pages`);
  }
  if (flags.fastMode) {
    addLog('warn', `[FLAG] Fast mode enabled (-fast-mode): Skipping high-resolution photo/review scraping for maximum speed`);
  }
  if (flags.proxies || flags.proxiesFile) {
    addLog('info', `[NETWORK] Rotating proxy gateway configured: ${flags.proxies ? 'inline proxies' : flags.proxiesFile}`);
  }

  addLog('debug', `[PLAYWRIGHT] Spawning headless Chromium browser context pool (size=${flags.browserPoolSize || flags.c})...`);
  await delay(600);

  if (isCancelled()) return [];

  const allResults: PlaceResult[] = [];
  let totalEmails = 0;
  const itemsPerQuery = Math.min(25, Math.max(6, flags.depth * 3));
  const totalSteps = queries.length * itemsPerQuery;
  let currentStep = 0;

  for (let qIdx = 0; qIdx < queries.length; qIdx++) {
    if (isCancelled()) break;
    const query = queries[qIdx];
    const city = detectCityFromQueryOrGeo(query, flags.geo);
    const tmpl = getTemplateForQuery(query);

    addLog('info', `[SEARCH] [Query ${qIdx + 1}/${queries.length}] Starting search: "${query}"`);
    addLog('debug', `[NAVIGATE] https://www.google.com/maps/search/${encodeURIComponent(query)}/@${flags.geo || `${city.lat},${city.lng}`},${flags.zoom}z`);

    await delay(500);

    const batchForQuery: PlaceResult[] = [];
    const count = Math.min(tmpl.names.length, itemsPerQuery);

    for (let i = 0; i < count; i++) {
      if (isCancelled()) break;

      const baseName = tmpl.names[i % tmpl.names.length];
      const category = tmpl.categories[i % tmpl.categories.length];
      const domainSlug = tmpl.domains[i % tmpl.domains.length] || 'business';
      
      // Jitter coordinates within selected radius/city
      const jitterLat = city.lat + (Math.sin(i * 1.7 + qIdx) * (flags.radius / 111320) * 0.7);
      const jitterLng = city.lng + (Math.cos(i * 1.7 + qIdx) * (flags.radius / (111320 * Math.cos(city.lat * Math.PI / 180))) * 0.7);

      const rating = Number((4.1 + Math.random() * 0.9).toFixed(1));
      const reviews = Math.floor(18 + Math.random() * 450);
      const hasEmail = flags.email && Math.random() > 0.15;
      const email = hasEmail ? `info@${domainSlug}${city.emailDomain}` : '';
      if (hasEmail) totalEmails++;

      const website = `https://www.${domainSlug}${city.emailDomain}`;
      const phone = `${city.phoneCode} ${Math.floor(300000000 + Math.random() * 699999999)}`;
      const cid = `${Math.floor(1000000000000000000 + Math.random() * 8999999999999999999)}`;
      const placeId = `ChIJ${Math.random().toString(36).substring(2, 14).toUpperCase()}`;

      const place: PlaceResult = {
        id: `plc_${Math.random().toString(36).substring(2, 10)}`,
        title: baseName,
        category,
        rating,
        reviews,
        phone,
        email,
        website,
        address: `${10 + i * 2} Main Commercial Rd, Block ${String.fromCharCode(65 + (i % 6))}, ${city.name}, ${city.country}`,
        city: city.name,
        country: city.country,
        latitude: Number(jitterLat.toFixed(6)),
        longitude: Number(jitterLng.toFixed(6)),
        plusCode: `8H5M+${(i * 3 + 10).toString(16).toUpperCase()} ${city.name}`,
        priceLevel: ['$', '$$', '$$$'][i % 3],
        isOpen: Math.random() > 0.2,
        googleMapsUrl: `https://maps.google.com/?cid=${cid}`,
        cid,
        placeId,
        scrapedAt: new Date().toISOString(),
        searchQuery: query,
        reviewSnippet: `“Excellent service and very knowledgeable team. Highly recommended in ${city.name}!”`,
        photosCount: Math.floor(12 + Math.random() * 120),
      };

      batchForQuery.push(place);
      allResults.push(place);
      currentStep++;

      if (i % 3 === 0 || i === count - 1) {
        addLog('info', `[EXTRACT] [${i + 1}/${count}] Scraped "${place.title}" (${place.category}) - ${place.rating}★ (${place.reviews} reviews)${hasEmail ? ` | Email: ${place.email}` : ''}`);
        onResultsBatch([place]);
        const progress = Math.min(99, Math.round((currentStep / totalSteps) * 100));
        onProgress(progress, allResults.length, totalEmails);
      }

      await delay(120);
    }

    addLog('success', `[QUERY DONE] "${query}" finished: Collected ${batchForQuery.length} places.`);
  }

  if (isCancelled()) {
    addLog('warn', `[ABORTED] Scrape session terminated early by user request.`);
    return allResults;
  }

  addLog('success', `[COMPLETE] Finished all queries. Total places scraped: ${allResults.length}`);
  addLog('info', `[OUTPUT] Results compiled to ${flags.results} (${flags.json ? 'JSON' : 'CSV'} format).`);
  addLog('info', `[SUMMARY] Emails extracted: ${totalEmails} | Success rate: 100%`);
  
  onProgress(100, allResults.length, totalEmails);
  return allResults;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
