import React from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface SellerRatingBadgeProps {
  rating?: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SellerRatingBadge: React.FC<SellerRatingBadgeProps> = ({
  rating = 4.9,
  reviewCount = 0,
  size = 'md',
  showCount = true,
  className,
  onClick
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const formattedRating = Number(rating || 5.0).toFixed(1);

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-black'
  };

  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "inline-flex items-center rounded-xl font-bold transition-all shadow-xs border select-none",
        "bg-amber-500/10 border-amber-500/30 text-amber-300",
        onClick && "cursor-pointer hover:bg-amber-500/20 active:scale-95",
        sizeClasses[size],
        className
      )}
      title={
        isKurdish
          ? `پلەی فرۆشیار: ${formattedRating} لە ٥ (${reviewCount} پێداچوونەوە)`
          : isArabic
          ? `تقييم التاجر: ${formattedRating} من ٥ (${reviewCount} تقييم)`
          : `Seller Rating: ${formattedRating} / 5 (${reviewCount} reviews)`
      }
    >
      <Star className={clsx(starSizes[size], "fill-amber-400 text-amber-400 shrink-0 drop-shadow-xs")} />
      <span className="font-mono font-black">{formattedRating}</span>
      {showCount && reviewCount > 0 && (
        <span className="text-amber-400/70 font-medium text-[10px]">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export default SellerRatingBadge;
