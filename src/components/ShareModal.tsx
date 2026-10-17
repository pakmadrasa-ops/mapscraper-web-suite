import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  ExternalLink,
  MessageCircle,
  Mail,
  Users,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const ShareModal: React.FC = () => {
  const { isShareModalOpen, setIsShareModalOpen, sharedAppUrl, showToast } = useApp();
  const [copied, setCopied] = useState(false);

  if (!isShareModalOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setCopied(true);
    showToast('App URL copied to clipboard! You can send it to your friends.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = encodeURIComponent(
    'Check out this Google Maps Scraper Web Suite! It includes interactive map picking, real-time lead extraction, and an Excel sheet viewer: ' +
      sharedAppUrl
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Share Google Maps Search Engine
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  Online & Public
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Share this live URL with friends, clients, or team members
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsShareModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          
          {/* URL Box */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              Public Online Application URL
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 font-mono text-xs text-blue-300 truncate select-all">
                {sharedAppUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Instant Share Channels
            </span>
            <div className="grid grid-cols-3 gap-2">
              
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-900/40 text-emerald-300 transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=Google%20Maps%20Scraper%20Web%20Suite&body=${shareText}`}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Email</span>
              </a>

              {/* Open in New Window */}
              <a
                href={sharedAppUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                <ExternalLink className="w-4 h-4 text-purple-400" />
                <span>Open Link</span>
              </a>

            </div>
          </div>

          {/* Sharing Permissions & Features */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-[11px] text-slate-400">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              What friends can do when they open this link:
            </h4>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>No Google AI Studio login needed — anyone with this URL can open and use the web suite directly in their browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Interact with the Leaflet map, choose coordinates, adjust radius circle, and configure scraper flags.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Sort, filter, and download Excel (.xlsx) / CSV datasets of scraped businesses.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Test the token purchase simulation with Credit Card, PayPal, and JazzCash.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hosted on Google Cloud Run (Asia Northeast)</span>
          </div>
          <button
            onClick={() => setIsShareModalOpen(false)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
