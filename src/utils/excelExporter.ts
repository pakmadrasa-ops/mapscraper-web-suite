import * as XLSX from 'xlsx';
import { PlaceResult } from '../types/scraper';
import { getGoogleMapsUrl } from './mapUrl';

export function exportToExcel(places: PlaceResult[], filename = 'google-maps-scraped-places.xlsx') {
  if (places.length === 0) return;

  const dataRows = places.map((place, index) => ({
    '#': index + 1,
    'Place Name': place.title,
    'Category': place.category,
    'Rating': place.rating,
    'Reviews Count': place.reviews,
    'Email Address': place.email || 'N/A',
    'Phone Number': place.phone || 'N/A',
    'Website': place.website || 'N/A',
    'Street Address': place.address,
    'City': place.city,
    'Country': place.country,
    'Latitude': place.latitude,
    'Longitude': place.longitude,
    'Plus Code': place.plusCode,
    'Price Level': place.priceLevel,
    'Currently Open': place.isOpen ? 'Yes' : 'No',
    'Google Maps URL': getGoogleMapsUrl(place),
    'CID': place.cid,
    'Search Query': place.searchQuery,
    'Scraped At': place.scrapedAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  // Auto-fit column widths
  const columnKeys = Object.keys(dataRows[0] || {});
  const colWidths = columnKeys.map(key => {
    let maxLen = key.length;
    dataRows.forEach(row => {
      const val = String((row as Record<string, unknown>)[key] || '');
      if (val.length > maxLen) {
        maxLen = Math.min(60, val.length);
      }
    });
    return { wch: Math.max(12, maxLen + 2) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Google Maps Places');

  XLSX.writeFile(workbook, filename);
}

export function exportToCsv(places: PlaceResult[], filename = 'google-maps-scraped-places.csv') {
  if (places.length === 0) return;

  const headers = [
    'Place Name',
    'Category',
    'Rating',
    'Reviews',
    'Email',
    'Phone',
    'Website',
    'Address',
    'City',
    'Country',
    'Latitude',
    'Longitude',
    'Plus Code',
    'Google Maps URL',
    'Search Query'
  ];

  const escapeCsv = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = places.map(p => [
    escapeCsv(p.title),
    escapeCsv(p.category),
    escapeCsv(p.rating),
    escapeCsv(p.reviews),
    escapeCsv(p.email),
    escapeCsv(p.phone),
    escapeCsv(p.website),
    escapeCsv(p.address),
    escapeCsv(p.city),
    escapeCsv(p.country),
    escapeCsv(p.latitude),
    escapeCsv(p.longitude),
    escapeCsv(p.plusCode),
    escapeCsv(getGoogleMapsUrl(p)),
    escapeCsv(p.searchQuery)
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToJson(places: PlaceResult[], filename = 'google-maps-scraped-places.json') {
  const jsonContent = JSON.stringify(places, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyPlacesToClipboard(places: PlaceResult[]): Promise<void> {
  const tsvRows = places.map(p => [
    p.title,
    p.category,
    p.rating,
    p.reviews,
    p.email || 'N/A',
    p.phone || 'N/A',
    p.website || 'N/A',
    p.address,
    p.city,
    p.googleMapsUrl
  ].join('\t'));

  const tsvHeader = ['Name', 'Category', 'Rating', 'Reviews', 'Email', 'Phone', 'Website', 'Address', 'City', 'URL'].join('\t');
  const content = [tsvHeader, ...tsvRows].join('\n');
  return navigator.clipboard.writeText(content);
}
