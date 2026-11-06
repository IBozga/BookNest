import React from 'react';
import { BookOpen, ShieldCheck, Zap, Award, Globe, Heart, Sparkles, ArrowRight } from 'lucide-react';

interface AboutViewProps {
  onExploreBooks: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onExploreBooks }) => {
  return (
    <div className="space-y-12 my-6 w-full">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-850 text-white p-8 sm:p-12 shadow-xl border border-stone-800 text-center sm:text-left">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-stone-100 border border-white/20 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>About BookNest</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-white tracking-tight leading-tight">
            Connecting Curious Minds with World-Class Digital Literature
          </h1>

          <p className="text-stone-200 text-xs sm:text-sm leading-relaxed">
            BookNest was founded with a singular purpose: to make reading, learning, and literary discovery seamless, beautiful, and accessible to readers across Europe and worldwide.
          </p>

          <div className="pt-2">
            <button
              onClick={onExploreBooks}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-stone-900 font-semibold text-xs hover:bg-stone-100 transition-colors shadow-md"
            >
              <span>Explore Our Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Core Mission & Philosophy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-stone-50 rounded-3xl p-8 sm:p-10 border border-stone-200">
        <div className="space-y-4">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Our Mission</span>
          <h2 className="text-2xl font-serif font-semibold text-stone-900">
            A Modern Reading Sanctuary Built for Lifelong Readers
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            We believe that great books have the power to transform minds, spark new ideas, and build futures. From cutting-edge artificial intelligence monographs to enduring literary masterpieces, BookNest curates publications from the world’s leading trade and academic houses.
          </p>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Whether you read on a dedicated e-reader, tablet, or laptop, your library is instantly synced and always at your fingertips.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-stone-900">Curated Quality</h3>
            <p className="text-[11px] text-stone-500 leading-normal">
              Hand-picked titles and verified editions across 6 major genres.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-stone-900">Instant Access</h3>
            <p className="text-[11px] text-stone-500 leading-normal">
              Zero waiting time with immediate EPUB & PDF downloads.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-stone-900">Multi-Currency</h3>
            <p className="text-[11px] text-stone-500 leading-normal">
              Native EUR (€), GBP (£), and USD ($) localized payments.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-stone-900">Reader Rewards</h3>
            <p className="text-[11px] text-stone-500 leading-normal">
              Earn gift points on every order to redeem for future reads.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Values */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-2xl font-serif font-semibold text-stone-900">
            Why Readers Love BookNest
          </h2>
          <p className="text-xs text-stone-500">
            Designed from the ground up for simplicity, trust, and speed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900">256-Bit Encrypted</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              State-of-the-art secure transactions supporting SEPA, iDEAL, Sofort, Apple Pay, and major international card networks.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900">Leading Publishers</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Direct partnerships with O&apos;Reilly Media, MIT Press, Penguin Random House, Tor Books, and HarperCollins.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900">Dedicated Support</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Fast, friendly reader assistance with lifetime access to all your purchased digital titles and previous order receipts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
