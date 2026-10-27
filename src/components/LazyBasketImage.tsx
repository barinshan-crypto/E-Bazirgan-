import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface LazyBasketImageProps {
  src: string;
  alt: string;
  className?: string;
  rootMargin?: string;
  onImageClick?: (e: React.MouseEvent) => void;
}

/**
 * LazyBasketImage: Uses IntersectionObserver to defer loading and decoding of
 * basket item images until they enter (or near) the viewport.
 * Dramatically speeds up cart rendering, eliminates UI freezing, and keeps memory lightweight.
 */
export const LazyBasketImage: React.FC<LazyBasketImageProps> = ({
  src,
  alt,
  className = "w-full h-full object-cover",
  rootMargin = "120px",
  onImageClick
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // If IntersectionObserver is not supported, immediately load
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const currentElem = containerRef.current;
    if (!currentElem) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin,
        threshold: 0.01
      }
    );

    observer.observe(currentElem);

    return () => {
      if (currentElem) {
        observer.unobserve(currentElem);
      }
      observer.disconnect();
    };
  }, [rootMargin]);

  return (
    <div 
      ref={containerRef} 
      onClick={onImageClick}
      className="relative w-full h-full overflow-hidden bg-slate-900/60 select-none flex items-center justify-center"
    >
      {/* Placeholder skeleton while not visible or while loading */}
      {(!isVisible || !isLoaded) && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-800/80 via-slate-900/90 to-slate-800/80 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-white/30 animate-pulse" />
        </div>
      )}

      {/* Lazy Loaded Image */}
      {isVisible && !hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Graceful Fallback if error loading image */}
      {hasError && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 p-1 text-center">
          <ImageIcon className="w-5 h-5 text-slate-500 mb-0.5" />
          <span className="text-[8px] font-bold">Image</span>
        </div>
      )}
    </div>
  );
};
