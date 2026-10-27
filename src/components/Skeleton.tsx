import React from 'react';
import clsx from 'clsx';

interface CardSkeletonProps {
  theme?: string;
  viewMode?: 'grid' | 'list';
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ theme = 'rainbow', viewMode = 'grid' }) => {
  const isDark = theme === 'tokyo' || theme === 'sunset' || theme === 'dark' || theme === 'midnight' || theme === 'emerald' || theme === 'dynamic' || theme === 'raining';

  if (viewMode === 'list') {
    return (
      <div className={clsx(
        "flex flex-col sm:flex-row border rounded-2xl sm:rounded-3xl overflow-hidden shadow-md animate-pulse transition-all",
        isDark ? "bg-slate-900/60 border-slate-800/80 shadow-black/20" : "bg-white border-slate-200/80 shadow-slate-100"
      )}>
        {/* Media thumbnail area */}
        <div className={clsx(
          "w-full sm:w-60 md:w-68 aspect-[4/3] sm:aspect-square shrink-0 relative overflow-hidden",
          isDark ? "bg-slate-950/80" : "bg-slate-100"
        )}>
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-skeleton-shimmer" />

          {/* Category Pill placeholder */}
          <div className={clsx(
            "absolute top-3 left-3 h-5 w-20 rounded-lg",
            isDark ? "bg-white/10" : "bg-black/10"
          )} />

          {/* Resale/Price Badge placeholder */}
          <div className={clsx(
            "absolute bottom-3 left-3 h-4 w-28 rounded-md",
            isDark ? "bg-white/10" : "bg-black/10"
          )} />
        </div>

        {/* Details area */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Title & Price Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-2 flex-1">
                <div className={clsx("h-5 w-3/4 rounded-lg", isDark ? "bg-white/15" : "bg-slate-200")} />
                {/* Seller & Rating line */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className={clsx("w-4 h-4 rounded-full", isDark ? "bg-white/15" : "bg-slate-200")} />
                    <div className={clsx("h-3.5 w-24 rounded", isDark ? "bg-white/15" : "bg-slate-200")} />
                  </div>
                  <span className={isDark ? "text-slate-700" : "text-slate-300"}>•</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400/40" />
                    <div className={clsx("h-3 w-8 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
                  </div>
                </div>
              </div>

              {/* Price placeholder */}
              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                <div className={clsx("h-6 w-28 rounded-lg", isDark ? "bg-emerald-500/20" : "bg-emerald-100")} />
                <div className={clsx("h-3.5 w-16 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
              </div>
            </div>

            {/* Description lines */}
            <div className="space-y-1.5 pt-1">
              <div className={clsx("h-3.5 w-full rounded", isDark ? "bg-white/10" : "bg-slate-100")} />
              <div className={clsx("h-3.5 w-4/5 rounded", isDark ? "bg-white/10" : "bg-slate-100")} />
            </div>
          </div>

          {/* Footer with badges and buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/20 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className={clsx("h-6 w-20 rounded-full", isDark ? "bg-white/10" : "bg-slate-100")} />
              <div className={clsx("h-6 w-24 rounded-full", isDark ? "bg-white/10" : "bg-slate-100")} />
            </div>
            <div className="flex items-center gap-2">
              <div className={clsx("h-9.5 w-32 rounded-xl", isDark ? "bg-indigo-600/30" : "bg-indigo-100")} />
              <div className={clsx("h-9.5 w-9.5 rounded-xl", isDark ? "bg-white/10" : "bg-slate-200")} />
              <div className={clsx("h-9.5 w-9.5 rounded-xl", isDark ? "bg-white/10" : "bg-slate-200")} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view version - precisely matching MarketplaceItemCard
  return (
    <div className={clsx(
      "border rounded-2xl sm:rounded-3xl overflow-hidden shadow-md flex flex-col animate-pulse transition-all",
      isDark ? "bg-slate-900/60 border-slate-800/80 shadow-black/20" : "bg-white border-slate-200/80 shadow-slate-100"
    )}>
      {/* Product Image Stage */}
      <div className={clsx(
        "aspect-[4/3] max-h-[280px] sm:max-h-[340px] relative overflow-hidden w-full",
        isDark ? "bg-slate-950/80" : "bg-slate-100"
      )}>
        {/* Shimmer sweep effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-skeleton-shimmer" />

        {/* Category Pill skeleton on top-left */}
        <div className={clsx(
          "absolute top-3 left-3 h-5 w-20 rounded-lg",
          isDark ? "bg-white/10" : "bg-black/10"
        )} />

        {/* Quick action button skeleton on top-right */}
        <div className={clsx(
          "absolute top-3 right-3 w-8 h-8 rounded-full",
          isDark ? "bg-white/10" : "bg-black/10"
        )} />

        {/* Audio / price overlay skeleton on bottom */}
        <div className={clsx(
          "absolute bottom-3 left-3 h-5 w-24 rounded-lg",
          isDark ? "bg-white/10" : "bg-black/10"
        )} />
      </div>

      {/* Card Content & Details */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Sub-header: category tag & star rating */}
          <div className="flex items-center justify-between">
            <div className={clsx("h-3 w-16 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-400/30" />
              <div className={clsx("h-3 w-8 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
            </div>
          </div>

          {/* Product Title lines */}
          <div className="space-y-1.5 pt-0.5">
            <div className={clsx("h-4 w-4/5 rounded-md", isDark ? "bg-white/15" : "bg-slate-200")} />
            <div className={clsx("h-3 w-3/5 rounded-md", isDark ? "bg-white/10" : "bg-slate-100")} />
          </div>

          {/* Price display block */}
          <div className="pt-1 flex items-baseline gap-2">
            <div className={clsx("h-6 w-28 rounded-lg", isDark ? "bg-emerald-500/20" : "bg-emerald-100")} />
            <div className={clsx("h-3.5 w-14 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
          </div>
        </div>

        {/* Bottom Section: Seller info + Action buttons */}
        <div className="space-y-3 pt-2 border-t border-slate-700/20 dark:border-slate-800/70">
          {/* Seller Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={clsx("w-6 h-6 rounded-full shrink-0", isDark ? "bg-white/15" : "bg-slate-200")} />
              <div className={clsx("h-3.5 w-24 rounded", isDark ? "bg-white/15" : "bg-slate-200")} />
            </div>
            <div className={clsx("h-3 w-12 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className={clsx("h-9 flex-1 rounded-xl", isDark ? "bg-indigo-600/30" : "bg-indigo-100")} />
            <div className={clsx("h-9 w-9 rounded-xl shrink-0", isDark ? "bg-white/10" : "bg-slate-200")} />
            <div className={clsx("h-9 w-9 rounded-xl shrink-0", isDark ? "bg-white/10" : "bg-slate-200")} />
          </div>
        </div>
      </div>
    </div>
  );
};

// SourcingHub: 2-column product card skeleton (matches Seller profile items and live showcase)
export const SourcingProductSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 gap-2.5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx} 
          className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow flex flex-col"
        >
          {/* Square Image Box */}
          <div className="aspect-square relative bg-slate-900 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-skeleton-shimmer" />
            <div className="absolute bottom-1.5 right-1.5 h-4 w-16 bg-slate-800/90 rounded-md" />
          </div>
          {/* Product Meta */}
          <div className="p-2 space-y-2 flex-1 flex flex-col justify-between">
            <div className="h-3 w-3/4 bg-slate-800/80 rounded" />
            <div className="h-2.5 w-1/2 bg-slate-800/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

// SourcingHub: Product Pin Picker Skeleton (matches item rows in Live Pin modal)
export const ProductPickerSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx} 
          className="p-3 rounded-2xl border border-slate-800/80 bg-slate-950 flex items-center gap-3"
        >
          {/* Square thumbnail */}
          <div className="w-12 h-12 rounded-xl bg-slate-900 shrink-0 relative overflow-hidden border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-skeleton-shimmer" />
          </div>
          {/* Title & Price */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3.5 bg-slate-800/80 rounded w-2/3" />
            <div className="h-3 bg-amber-400/20 rounded w-1/3" />
          </div>
          {/* Action Badge */}
          <div className="w-12 h-6 bg-slate-800/60 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
};
