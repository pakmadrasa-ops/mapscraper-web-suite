import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getGoogleMapsUrl } from '../utils/mapUrl';
import {
  X,
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Navigation,
  Code,
  User,
  Building2,
  Calendar
} from 'lucide-react';

export const PlaceDetailModal: React.FC = () => {
  const { selectedPlace, setSelectedPlace, showToast } = useApp();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!selectedPlace) return null;

  const mapUrl = getGoogleMapsUrl(selectedPlace);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${key} to clipboard!`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {selectedPlace.thumbnail ? (
              <img
                src={selectedPlace.thumbnail}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="truncate">
              <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-semibold block">
                {selectedPlace.category}
              </span>
              <h3 className="text-xl font-bold text-slate-100 leading-snug truncate">{selectedPlace.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Primary Google Maps Direct Link */}
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
              title="Open location directly in Google Maps in a new tab"
            >
              <MapPin className="w-4 h-4 text-rose-300 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Open on Google Maps</span>
              <span className="sm:hidden">Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
            </a>

            <button
              onClick={() => setSelectedPlace(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close details"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body with comfortable, larger font sizes */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          
          {/* Top Rating & Status Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-base">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>{selectedPlace.rating}</span>
              <span className="text-slate-400 font-normal font-mono text-sm">
                ({selectedPlace.reviews?.toLocaleString()} reviews)
              </span>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm">
              Price: <span className="font-mono text-emerald-400">{selectedPlace.priceLevel || '$$'}</span>
            </div>

            <div className={`px-3.5 py-1.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 border ${
              selectedPlace.isOpen
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{selectedPlace.isOpen ? 'Open Now' : 'Closed'}</span>
            </div>

            {selectedPlace.categories && selectedPlace.categories.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedPlace.categories.slice(1).map((cat, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 border border-slate-700 font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Google Maps Location Highlight Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-100">Google Map Location</h4>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Live Link
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate max-w-sm sm:max-w-md mt-0.5" title={selectedPlace.address}>
                  {selectedPlace.address || `Lat: ${selectedPlace.latitude}, Lng: ${selectedPlace.longitude}`}
                </p>
              </div>
            </div>

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] shrink-0"
              title="Click to view exact Google Maps location with directions & photos"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Take Me to Google Maps</span>
            </a>
          </div>

          {/* Contact Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* Phone */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-xs text-slate-400 block uppercase font-medium">Phone Number</span>
                  {selectedPlace.phone ? (
                    <a
                      href={`tel:${selectedPlace.phone}`}
                      className="text-blue-300 font-mono text-sm font-semibold hover:underline truncate block mt-0.5"
                    >
                      {selectedPlace.phone}
                    </a>
                  ) : (
                    <span className="text-slate-500 text-xs">None listed</span>
                  )}
                </div>
              </div>
              {selectedPlace.phone && (
                <button
                  onClick={() => copyToClipboard(selectedPlace.phone, 'Phone')}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Copy Phone"
                >
                  {copiedKey === 'Phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Email */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-xs text-slate-400 block uppercase font-medium">Email Address</span>
                  {selectedPlace.email ? (
                    <a
                      href={`mailto:${selectedPlace.email}`}
                      className="text-amber-300 font-mono text-sm font-semibold hover:underline truncate block mt-0.5"
                    >
                      {selectedPlace.email}
                    </a>
                  ) : (
                    <span className="text-slate-500 text-xs">Not listed</span>
                  )}
                </div>
              </div>
              {selectedPlace.email && (
                <button
                  onClick={() => copyToClipboard(selectedPlace.email, 'Email')}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Copy Email"
                >
                  {copiedKey === 'Email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Website */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-xs text-slate-400 block uppercase font-medium">Official Website</span>
                  {selectedPlace.website ? (
                    <a
                      href={selectedPlace.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-300 font-mono text-sm font-semibold hover:underline truncate block mt-0.5"
                    >
                      {selectedPlace.website}
                    </a>
                  ) : (
                    <span className="text-slate-500 text-xs">No website listed</span>
                  )}
                </div>
              </div>
              {selectedPlace.website && (
                <a
                  href={selectedPlace.website}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Address */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-xs text-slate-400 block uppercase font-medium">Street Address</span>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-200 hover:text-sky-300 text-sm font-medium truncate block mt-0.5 hover:underline flex items-center gap-1.5"
                    title={`Click to open address in Google Maps: ${selectedPlace.address}`}
                  >
                    <span className="truncate">{selectedPlace.address}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                  title="Open this location in Google Maps"
                >
                  <MapPin className="w-4 h-4 text-rose-400" />
                </a>
                <button
                  onClick={() => copyToClipboard(selectedPlace.address, 'Address')}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Copy Address"
                >
                  {copiedKey === 'Address' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </div>

          {/* Opening Hours Schedule */}
          {selectedPlace.hours && Object.keys(selectedPlace.hours).length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Weekly Business Hours Schedule
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(selectedPlace.hours).map(([day, hrs]) => (
                  <div key={day} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-semibold block">{day}</span>
                    <span className="text-slate-200 font-mono mt-0.5 block">{hrs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scraped Customer Reviews Section */}
          {selectedPlace.user_reviews && selectedPlace.user_reviews.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Scraped Customer Reviews ({selectedPlace.user_reviews.length})
              </h4>
              <div className="space-y-3">
                {selectedPlace.user_reviews.map((rev, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {rev.ProfilePicture ? (
                          <img
                            src={rev.ProfilePicture}
                            alt={rev.Name || ''}
                            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                            {rev.Name ? rev.Name[0] : 'U'}
                          </div>
                        )}
                        <div>
                          <strong className="text-sm text-slate-100 font-bold block">{rev.Name || 'Anonymous Reviewer'}</strong>
                          {rev.When && <span className="text-xs text-slate-400">{rev.When}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-bold text-xs font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rev.Rating || 5}★</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-slate-700 pl-3">
                      "{rev.Description}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coordinates & Google Maps Direct Link */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 block uppercase font-medium">Coordinates & CID</span>
              <div className="flex items-center gap-4 font-mono text-sm text-slate-200">
                <span>Lat: <strong className="text-blue-400">{selectedPlace.latitude}</strong></span>
                <span>Lng: <strong className="text-blue-400">{selectedPlace.longitude}</strong></span>
                {selectedPlace.plusCode && <span>Plus Code: <strong className="text-slate-300">{selectedPlace.plusCode}</strong></span>}
              </div>
            </div>

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-md shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]"
              title="Open exact location coordinates on Google Maps"
            >
              <MapPin className="w-4 h-4 text-rose-300" />
              <span>View on Google Maps</span>
              <ExternalLink className="w-4 h-4 text-blue-200" />
            </a>
          </div>

          {/* Developer JSON Inspect */}
          <div className="pt-1">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-mono"
            >
              <Code className="w-4 h-4" />
              {showRawJson ? 'Hide Raw Scraper JSON' : 'Inspect Raw Scraper JSON Object'}
            </button>
            {showRawJson && (
              <pre className="mt-2.5 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-56 overflow-y-auto leading-relaxed">
                {JSON.stringify(selectedPlace, null, 2)}
              </pre>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-sm text-slate-400">
          <span>Search query: <code className="text-slate-200 font-mono">"{selectedPlace.searchQuery}"</code></span>
          <button
            onClick={() => setSelectedPlace(null)}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-bold text-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
