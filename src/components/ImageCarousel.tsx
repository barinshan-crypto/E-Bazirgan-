import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  videoUrl?: string;
  theme?: string;
  onImageClick?: () => void;
  aspectRatio?: string;
  className?: string;
}

export const isVideoUrl = (url?: string) => {
  if (!url) return false;
  return url.startsWith('data:video') || url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('/video/upload/');
};

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images: rawImages = [],
  alt = '',
  videoUrl,
  theme = '',
  onImageClick,
  aspectRatio = 'aspect-square',
  className = ''
}) => {
  const mediaList: string[] = [];
  if (videoUrl) {
    mediaList.push(videoUrl);
  }
  if (rawImages && rawImages.length > 0) {
    rawImages.forEach(img => {
      if (img && !mediaList.includes(img)) {
        mediaList.push(img);
      }
    });
  }
  if (mediaList.length === 0) {
    mediaList.push('https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80');
  }

  // Dynamic Photo Filter Styling based on current active theme
  const photoFilterClass = 
    theme === 'rainbow' ? 'photo-vibe-vibrant' :
    theme === 'wavy' ? 'photo-vibe-kawaii' :
    theme === 'sunset' ? 'photo-vibe-sunset' :
    theme === 'tokyo' ? 'photo-vibe-tokyo' :
    '';

  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      if (width > 0) {
        const newIndex = Math.round(scrollLeft / width);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < mediaList.length) {
          setCurrentIndex(newIndex);
        }
      }
    }
  };

  const scrollToImage = (index: number) => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      containerRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIndex = (currentIndex - 1 + mediaList.length) % mediaList.length;
    scrollToImage(prevIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (currentIndex + 1) % mediaList.length;
    scrollToImage(nextIndex);
  };

  return (
    <div className={clsx("relative w-full overflow-hidden group/carousel bg-slate-950", aspectRatio, className)}>
      {/* Scrollable Container with Instagram Horizontal Scroll Snap */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        dir="ltr"
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar select-none"
      >
        {mediaList.map((mediaUrl, idx) => {
          const isVid = isVideoUrl(mediaUrl);
          return (
            <div
              key={`${idx}-${mediaUrl.slice(0, 30)}`}
              onClick={onImageClick}
              className="w-full h-full flex-shrink-0 snap-center relative"
            >
              {isVid ? (
                <video
                  src={mediaUrl}
                  className={clsx("w-full h-full object-cover transition-transform duration-300 group-hover/carousel:scale-105", photoFilterClass)}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={alt}
                  className={clsx("w-full h-full object-cover transition-transform duration-300 group-hover/carousel:scale-105", photoFilterClass)}
                  draggable={false}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Instagram Photo Counter Badge (1/N) - strictly forced LTR */}
      {mediaList.length > 1 && (
        <div 
          dir="ltr" 
          className="absolute top-2.5 right-2.5 z-20 bg-black/80 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow-xl pointer-events-none flex items-center justify-center gap-1 leading-none tracking-normal"
        >
          <span className="text-indigo-400 font-extrabold">{currentIndex + 1}</span>
          <span className="text-slate-400">/</span>
          <span className="text-white font-medium">{mediaList.length}</span>
        </div>
      )}

      {/* Instagram Navigation Buttons & Dots */}
      {mediaList.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100 z-20 active:scale-90 shadow-xl border border-white/15 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100 z-20 active:scale-90 shadow-xl border border-white/15 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Instagram Dot Indicators at Bottom */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-auto bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
            {mediaList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToImage(idx);
                }}
                className={clsx(
                  "transition-all duration-300 rounded-full cursor-pointer",
                  idx === currentIndex ? "bg-white w-4 h-1.5 shadow-md" : "bg-white/40 w-1.5 h-1.5 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;
