export interface ScraperFlags {
  // Input & Output
  input: string; // queries text (multiline or file)
  results: string; // default "gmaps-output/results.csv"
  json: boolean; // default false
  resume: boolean; // default false
  
  // Depth & Timing
  depth: number; // default 10 (1-50)
  exitOnInactivity: string; // default "3m"
  fastMode: boolean; // default false
  
  // Location & Spatial
  geo: string; // lat,lng (e.g. "31.5204,74.3587")
  radius: number; // in meters, default 10000
  zoom: number; // 0-21, default 15
  useGrid: boolean; // whether to use grid-bbox instead of geo+radius
  gridBbox: string; // "minLat,minLon,maxLat,maxLon"
  gridCell: number; // float km, default 1.0
  lang: string; // default "en"
  
  // Concurrency & JS Pool
  c: number; // concurrency, default 1
  browserPoolSize: number; // default 0
  pagesPerBrowser: number; // default 1
  disablePageReuse: boolean; // default false
  debug: boolean; // headful crawl default false
  
  // Extraction Options
  email: boolean; // extract emails from websites
  extraReviews: boolean; // enable extra reviews collection
  
  // Network & Proxies
  proxies: string;
  proxiesFile: string;
  cache: string; // default "cache"
  dataFolder: string; // default "webdata"
  addr: string; // default ":8080"
  web: boolean; // default false
  
  // AWS / Enterprise Cloud
  awsLambda: boolean;
  awsRegion: string;
  awsAccessKey: string;
  awsSecretKey: string;
  awsLambdaChunkSize: number;
  awsLambdaInvoker: boolean;
  functionName: string;
  s3Bucket: string;
  leadsdbApiKey: string;
  dsn: string;
  writer: string;
  
  // Binary executable path
  binaryPath: string; // default "./google_maps_scraper-1.18.1-linux-amd64"
}

export interface PlaceReviewItem {
  Name?: string;
  ProfilePicture?: string;
  Rating?: number;
  Description?: string;
  When?: string;
  review_id?: string;
  source?: string;
}

export interface PlaceResult {
  id: string;
  title: string;
  category: string;
  categories?: string[];
  rating: number;
  reviews: number;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  plusCode: string;
  priceLevel: string;
  isOpen: boolean;
  hours?: Record<string, string>;
  open_hours_raw?: Record<string, string[]>;
  googleMapsUrl: string;
  cid: string;
  placeId: string;
  scrapedAt: string;
  searchQuery: string;
  reviewSnippet?: string;
  photosCount?: number;
  thumbnail?: string;
  images?: string[];
  timezone?: string;
  complete_address?: {
    borough?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    state?: string;
    country?: string;
  };
  user_reviews?: PlaceReviewItem[];
  reviews_per_rating?: Record<string, number>;
  owner?: {
    id?: string;
    name?: string;
    link?: string;
  };
}

export interface ScrapingJob {
  id: string;
  name: string;
  timestamp: string;
  status: 'idle' | 'running' | 'completed' | 'partial' | 'failed' | 'paused';
  flags: ScraperFlags;
  generatedCommand: string;
  progress: number;
  totalEstimated: number;
  scrapedCount: number;
  emailsFoundCount: number;
  logs: LogLine[];
  results: PlaceResult[];
  error?: string;
}

export interface LogLine {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
}
