import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlaceResult } from '../types/scraper';
import { copyPlacesToClipboard, exportToCsv, exportToExcel, exportToJson } from '../utils/excelExporter';
import { getGoogleMapsUrl } from '../utils/mapUrl';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  ExternalLink,
  Phone,
  Mail,
  Star,
  MapPin,
  Check,
  Copy,
  FileSpreadsheet,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  Building2,
  Clock
} from 'lucide-react';

type SortField = keyof PlaceResult;
type SortOrder = 'asc' | 'desc';

export const SpreadsheetView: React.FC = () => {
  const { places, setPlaces, setSelectedPlace, syncFromOutputFile, showToast } = useApp();

  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [emailOnly, setEmailOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    places.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [places]);

  // Handle header click to sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filtered & Sorted places
  const filteredPlaces = useMemo(() => {
    return places.filter(place => {
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = place.title.toLowerCase().includes(term);
        const matchesAddress = place.address.toLowerCase().includes(term);
        const matchesCategory = place.category.toLowerCase().includes(term);
        const matchesEmail = place.email?.toLowerCase().includes(term);
        const matchesPhone = place.phone?.toLowerCase().includes(term);
        if (!matchesName && !matchesAddress && !matchesCategory && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && place.category !== categoryFilter) {
        return false;
      }

      // Email only filter
      if (emailOnly && !place.email) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [places, searchTerm, categoryFilter, emailOnly, sortField, sortOrder]);

  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, emailOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / (pageSize || 1)));
  const paginatedPlaces = useMemo(() => {
    if (pageSize === 0) return filteredPlaces; // 0 = all
    const start = (currentPage - 1) * pageSize;
    return filteredPlaces.slice(start, start + pageSize);
  }, [filteredPlaces, currentPage, pageSize]);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPlaces.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlaces.map(p => p.id)));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Export handlers
  const placesToExport = selectedIds.size > 0 
    ? places.filter(p => selectedIds.has(p.id)) 
    : filteredPlaces;

  const handleExportExcel = () => {
    exportToExcel(placesToExport, `maps-scraper-${Date.now()}.xlsx`);
    showToast(`Exported ${placesToExport.length} rows to Excel (.xlsx)!`, 'success');
  };

  const handleExportCsv = () => {
    exportToCsv(placesToExport, `maps-scraper-${Date.now()}.csv`);
    showToast(`Exported ${placesToExport.length} rows to CSV!`, 'success');
  };

  const handleExportJson = () => {
    exportToJson(placesToExport, `maps-scraper-${Date.now()}.json`);
    showToast(`Exported ${placesToExport.length} rows to JSON!`, 'success');
  };

  const handleCopyClipboard = async () => {
    await copyPlacesToClipboard(placesToExport);
    setCopied(true);
    showToast(`Copied ${placesToExport.length} places (TSV format) to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setPlaces(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    showToast(`Removed selected records from view.`, 'info');
  };

  const handleRefreshFromDisk = async () => {
    setIsRefreshing(true);
    await syncFromOutputFile();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Metrics
  const emailCount = places.filter(p => !!p.email).length;
  const avgRating = places.length > 0 
    ? (places.reduce((acc, p) => acc + (p.rating || 0), 0) / places.length).toFixed(1) 
    : '0.0';

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-400 font-bold" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-400 font-bold" />
    );
  };

  return (
    <div className="space-y-5">
      {/* Excel Sheet Controls & Export Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        
        {/* Top Header with Stats and Metrics */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                Google Maps Scraped Places Spreadsheet
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 font-mono font-semibold">
                  {filteredPlaces.length} entries
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Click any column header to sort in ascending or descending order. Filter, inspect profiles, and export.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges & Reload */}
          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            <button
              onClick={handleRefreshFromDisk}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
              title="Refresh directly from gmaps-output/results.json"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Reload Output</span>
            </button>

            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Total Places:</span>
              <span className="font-bold font-mono text-slate-100 text-base">{places.length}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-medium">Emails:</span>
              <span className="font-bold font-mono text-amber-300 text-base">{emailCount}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-blue-300 font-medium">Avg Rating:</span>
              <span className="font-bold font-mono text-blue-300 text-base">{avgRating}★</span>
            </div>
          </div>
        </div>

        {/* Search, Filter Bar and Export Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search name, category, phone, email, address..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-sm font-medium rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Email Only Toggle */}
            <button
              onClick={() => setEmailOnly(!emailOnly)}
              className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border ${
                emailOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>With Email Only</span>
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
              title="Download Microsoft Excel (.xlsx) formatted workbook"
            >
              <Download className="w-4 h-4" />
              <span>Export .XLSX</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 border border-slate-700"
              title="Download standard CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export .CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors border border-slate-700"
              title="Download raw JSON"
            >
              <span>.JSON</span>
            </button>
            <button
              onClick={handleCopyClipboard}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors border border-slate-700 flex items-center gap-1.5"
              title="Copy table to clipboard (TSV format)"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Table'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Data Grid with Bigger Fonts & Row Heights */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            {/* Excel Column Letters Header (A, B, C, D...) */}
            <thead>
              <tr className="bg-slate-950/90 text-slate-500 font-mono text-xs select-none border-b border-slate-800">
                <th className="w-12 px-4 py-2 text-center border-r border-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredPlaces.length && filteredPlaces.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                  />
                </th>
                <th className="px-3 py-2 border-r border-slate-800 text-center w-14">#</th>
                <th className="px-4 py-2 border-r border-slate-800">A</th>
                <th className="px-4 py-2 border-r border-slate-800">B</th>
                <th className="px-4 py-2 border-r border-slate-800">C</th>
                <th className="px-4 py-2 border-r border-slate-800">D</th>
                <th className="px-4 py-2 border-r border-slate-800 text-center text-sky-400 font-semibold">E</th>
                <th className="px-4 py-2 border-r border-slate-800">F</th>
                <th className="px-4 py-2 border-r border-slate-800">G</th>
                <th className="px-4 py-2 border-r border-slate-800">H</th>
                <th className="px-4 py-2 border-r border-slate-800">I</th>
                <th className="px-4 py-2 text-center">J</th>
              </tr>

              {/* Clickable Column Sort Headers (Bigger Text) */}
              <tr className="bg-slate-950 text-slate-200 font-bold border-b border-slate-800 sticky top-0 z-10 shadow-sm text-sm">
                <th className="px-4 py-3.5 text-center border-r border-slate-800">
                  <Filter className="w-4 h-4 mx-auto text-slate-500" />
                </th>
                <th className="px-3 py-3.5 text-center border-r border-slate-800 font-mono text-slate-400">
                  Row
                </th>
                
                {/* Place Name */}
                <th
                  onClick={() => handleSort('title')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[240px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Place Name</span>
                    {renderSortIndicator('title')}
                  </div>
                </th>

                {/* Category */}
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[160px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Category</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>

                {/* Rating */}
                <th
                  onClick={() => handleSort('rating')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Rating</span>
                    {renderSortIndicator('rating')}
                  </div>
                </th>

                {/* Reviews */}
                <th
                  onClick={() => handleSort('reviews')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Reviews</span>
                    {renderSortIndicator('reviews')}
                  </div>
                </th>

                {/* Google Map Location */}
                <th className="px-4 py-3.5 border-r border-slate-800 text-center select-none min-w-[150px]">
                  <span className="flex items-center justify-center gap-1.5 text-sky-400 font-bold">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    Google Map
                  </span>
                </th>

                {/* Email Address */}
                <th
                  onClick={() => handleSort('email')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[190px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-amber-400" />
                      Email Address
                    </span>
                    {renderSortIndicator('email')}
                  </div>
                </th>

                {/* Phone */}
                <th
                  onClick={() => handleSort('phone')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[160px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Phone Number</span>
                    {renderSortIndicator('phone')}
                  </div>
                </th>

                {/* Website */}
                <th
                  onClick={() => handleSort('website')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[180px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Website</span>
                    {renderSortIndicator('website')}
                  </div>
                </th>

                {/* Address */}
                <th
                  onClick={() => handleSort('address')}
                  className="px-4 py-3.5 border-r border-slate-800 cursor-pointer hover:bg-slate-800/70 transition-colors group select-none min-w-[260px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Address</span>
                    {renderSortIndicator('address')}
                  </div>
                </th>

                {/* Action View */}
                <th className="px-4 py-3.5 text-center font-bold min-w-[90px]">
                  Details
                </th>
              </tr>
            </thead>

            {/* Table Rows with Bigger Fonts */}
            <tbody className="divide-y divide-slate-800/70">
              {filteredPlaces.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileSpreadsheet className="w-10 h-10 text-slate-600" />
                      <p className="text-base font-semibold">
                        {places.length === 0 ? 'No scrape results available' : 'No places found matching your filters'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {places.length === 0
                          ? 'Run the scraper to populate this sheet, or reload output from disk.'
                          : 'Try changing your filters or search term.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPlaces.map((place, index) => {
                  const isSelected = selectedIds.has(place.id);
                  const rowIndex = pageSize > 0 ? (currentPage - 1) * pageSize + index + 1 : index + 1;
                  const mapUrl = getGoogleMapsUrl(place);

                  return (
                    <tr
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-950/30' : index % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="px-4 py-3.5 text-center border-r border-slate-800/60"
                        onClick={e => toggleSelectRow(place.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950"
                        />
                      </td>

                      {/* Row Index */}
                      <td className="px-3 py-3.5 text-center border-r border-slate-800/60 font-mono text-xs text-slate-400">
                        {rowIndex}
                      </td>

                      {/* Place Name & Thumbnail */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60 font-semibold text-slate-100">
                        <div className="flex items-center gap-2.5">
                          {place.thumbnail ? (
                            <img
                              src={place.thumbnail}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                              <Building2 className="w-4 h-4" />
                            </div>
                          )}

                          <div className="truncate max-w-[220px]">
                            <span className="truncate block font-bold text-slate-100 text-base" title={place.title}>
                              {place.title}
                            </span>
                            {place.complete_address?.borough && (
                              <span className="text-sm text-slate-400 truncate block">
                                {place.complete_address.borough}
                              </span>
                            )}
                          </div>

                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-white border border-sky-500/30 hover:border-sky-400 transition-colors shrink-0"
                            title={`Open "${place.title}" location on Google Maps`}
                          >
                            <MapPin className="w-3 h-3 text-rose-400" />
                            <span>Map</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60 text-slate-300">
                        <span className="px-3 py-1 rounded-md text-sm font-semibold bg-slate-800 text-slate-200 border border-slate-700 whitespace-nowrap">
                          {place.category}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-base text-slate-100">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span>{place.rating}</span>
                        </div>
                      </td>

                      {/* Reviews */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60 font-mono text-base text-slate-300">
                        {place.reviews?.toLocaleString()}
                      </td>

                      {/* Google Map Direct Link Button */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60 text-center whitespace-nowrap">
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-600/25 hover:shadow-blue-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all group cursor-pointer"
                          title={`Open ${place.title} on Google Maps in a new tab`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-rose-300 group-hover:animate-pulse shrink-0" />
                          <span>View Map</span>
                          <ExternalLink className="w-3.5 h-3.5 text-blue-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                        </a>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60">
                        {place.email ? (
                          <a
                            href={`mailto:${place.email}`}
                            onClick={e => e.stopPropagation()}
                            className="text-amber-400 hover:text-amber-300 font-mono text-sm flex items-center gap-1.5 truncate max-w-[210px]"
                            title={place.email}
                          >
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">{place.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-600 font-mono text-sm">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60">
                        {place.phone ? (
                          <a
                            href={`tel:${place.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Phone className="w-4 h-4 shrink-0" />
                            <span>{place.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-600 font-mono text-sm">—</span>
                        )}
                      </td>

                      {/* Website */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60">
                        {place.website ? (
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-slate-200 hover:text-blue-400 flex items-center gap-1.5 truncate max-w-[190px]"
                            title={place.website}
                          >
                            <span className="truncate text-sm font-mono">{place.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-600 font-mono text-sm">—</span>
                        )}
                      </td>

                      {/* Address with Clickable Google Maps Action */}
                      <td className="px-4 py-3.5 border-r border-slate-800/60 text-slate-300">
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-2 truncate max-w-[280px] hover:text-sky-300 transition-colors group cursor-pointer"
                          title={`Click to open address on Google Maps: ${place.address}`}
                        >
                          <MapPin className="w-4 h-4 text-rose-400/80 group-hover:text-rose-400 shrink-0 transition-colors" />
                          <span className="truncate text-sm group-hover:underline decoration-sky-400/60 underline-offset-2">{place.address}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-sky-400 shrink-0 transition-opacity" />
                        </a>
                      </td>

                      {/* Details Button */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedPlace(place)}
                          className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-semibold flex items-center gap-1.5 mx-auto"
                          title="View customer reviews and complete profile"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar with pagination and larger text */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-100">{paginatedPlaces.length}</strong> of{' '}
              <strong className="text-slate-100">{filteredPlaces.length}</strong> entries
              {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs">
              <span className="text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={0}>All</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && pageSize > 0 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 text-xs font-semibold text-slate-200 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-mono text-slate-400">
                Page <strong className="text-slate-100">{currentPage}</strong> of <strong className="text-slate-100">{totalPages}</strong>
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 text-xs font-semibold text-slate-200 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
