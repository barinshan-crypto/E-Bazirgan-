import React from 'react';
import officialLogoAsset from '../assets/images/ebazirgan_emblem_transparent.png';
import officialFullLogoAsset from '../assets/images/ebazirgan_full_transparent.png';
import officialLogoJpg from '../assets/images/ebazirgan_logo.jpg';

interface EBazirganLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textColor?: string;
  variant?: 'icon' | 'badge' | 'full' | 'hero';
  withBackground?: boolean;
  useAsset?: boolean;
}

/**
 * EBazirganLogo
 * Official 3D Monogram Emblem of E-Bazirgan:
 * - Left Letter "E": Sculpted in Deep Dark Navy Blue with 3D specular shine
 * - Right Letter "B": Sculpted in Rich Radiant 24K Gold with high metallic luster
 * - Uses exact official transparent image asset by default as requested by user
 */
/**
 * XCrossShootingStar:
 * The shooting star enters the open space inside Letter 'E', travels diagonally across
 * through the central nexus between E and B ("like x move"), comes out through the open space
 * of Letter 'B', and then gracefully fades out into thin air ("and fade then").
 * Alternates between the two crossing diagonals of the 'X' for a continuous, mesmerizing luxury effect.
 */
function XCrossShootingStar() {
  const animFrameRef = React.useRef<number | null>(null);

  // Diagonal 1: Upper space of 'E' -> Center Nexus (50, 50) -> Lower space of 'B' -> Exits & Fades
  const knotsA = React.useMemo(() => [
    { x: 12, y: 18 }, // Approaching outer entry
    { x: 26, y: 28 }, // Entering the open space inside upper Letter 'E'
    { x: 37, y: 38 }, // Inner arch of 'E' gliding toward center
    { x: 50, y: 50 }, // Central crossing nexus between E and B ("like x move")
    { x: 63, y: 62 }, // Sweeping into the open space inside lower Letter 'B'
    { x: 76, y: 72 }, // Coming out through the space of Letter 'B'
    { x: 92, y: 82 }, // Emerging into open space beyond 'B'
    { x: 104, y: 88 }, // Dissolving completely
  ], []);

  // Diagonal 2: Lower space of 'E' -> Center Nexus (50, 50) -> Upper space of 'B' -> Exits & Fades
  const knotsB = React.useMemo(() => [
    { x: 12, y: 82 }, // Approaching outer entry
    { x: 26, y: 72 }, // Entering the open space inside lower Letter 'E'
    { x: 37, y: 62 }, // Inner arch of 'E' gliding toward center
    { x: 50, y: 50 }, // Central crossing nexus between E and B ("like x move")
    { x: 63, y: 38 }, // Sweeping into the open space inside upper Letter 'B'
    { x: 76, y: 28 }, // Coming out through the space of Letter 'B'
    { x: 92, y: 18 }, // Emerging into open space beyond 'B'
    { x: 104, y: 12 }, // Dissolving completely
  ], []);

  // Open Catmull-Rom spline interpolation
  const getOpenPosition = React.useCallback(
    (knots: Array<{ x: number; y: number }>, progress: number) => {
      const n = knots.length;
      if (n === 0) return { x: 50, y: 50 };
      if (n === 1) return knots[0];
      const p = Math.max(0, Math.min(1, progress));
      const u = p * (n - 1);
      const i1 = Math.min(Math.floor(u), n - 2);
      const t = u - i1;
      const i0 = Math.max(0, i1 - 1);
      const i2 = Math.min(n - 1, i1 + 1);
      const i3 = Math.min(n - 1, i1 + 2);

      const t2 = t * t;
      const t3 = t2 * t;

      const p0 = knots[i0];
      const p1 = knots[i1];
      const p2 = knots[i2];
      const p3 = knots[i3];

      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      return { x, y };
    },
    []
  );

  const [, setTick] = React.useState(0);
  const timeRef = React.useRef(0);

  React.useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      timeRef.current += dt;
      setTick(t => (t + 1) % 1000);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Duration per diagonal stroke: 3800ms; total cycle = 7600ms
  const strokeDuration = 3800;
  const cycleTime = timeRef.current % (strokeDuration * 2);
  const strokeIndex = cycleTime < strokeDuration ? 0 : 1;
  const strokeProgress = (cycleTime % strokeDuration) / strokeDuration;

  const currentKnots = strokeIndex === 0 ? knotsA : knotsB;
  const headPos = getOpenPosition(currentKnots, strokeProgress);

  // Master opacity: fades in entering space of 'E', stays bright crossing, fades out coming out of 'B' ("and fade then")
  let masterOpacity = 1;
  if (strokeProgress < 0.15) {
    masterOpacity = strokeProgress / 0.15;
  } else if (strokeProgress > 0.68) {
    masterOpacity = Math.max(0, 1 - (strokeProgress - 0.68) / 0.28);
  }

  // Sparkling star rotation & twinkle scale
  const starRotation = (timeRef.current * 0.045) % 360;
  const twinkle = 0.88 + 0.22 * Math.sin(timeRef.current * 0.006);

  // Center nexus X-crossing subtle glow pulse
  const distFromCenter = Math.abs(strokeProgress - 0.5);
  const nexusGlow = distFromCenter < 0.12 ? (1 - distFromCenter / 0.12) * 0.8 : 0;

  // Rich, long smoky stardust comet tail ("دوکەڵێکی درێژی بریقەدار")
  const trailCount = 18;
  const trailColors = [
    '#FFFFFF', // 0: Diamond tip
    '#FFFBEB', // 1: Brilliant Ivory
    '#FEF08A', // 2: 24K Gold
    '#FEF08A', // 3: 24K Gold
    '#FDE047', // 4: Yellow Gold
    '#FCD34D', // 5: Champagne
    '#FBBF24', // 6: Radiant Amber
    '#F59E0B', // 7: Deep Amber
    '#F59E0B', // 8: Deep Amber
    '#FDA4AF', // 9: Soft Rose Gold
    '#F472B6', // 10: Soft Blossom
    '#D8B4FE', // 11: Celestial Lavender
    '#C4B5FD', // 12: Soft Purple
    '#93C5FD', // 13: Celestial Sky
    '#60A5FA', // 14: Soft Blue
    '#FBBF24', // 15: Fading Amber
    '#F59E0B', // 16: Deep Gold Dust
    '#D97706', // 17: Faint Stardust
  ];

  const trailParticles = [];
  for (let i = 1; i <= trailCount; i++) {
    const lag = i * 0.011; // Luminous smoky stardust wake trailing along the diagonal stroke
    const particleProgress = strokeProgress - lag;
    if (particleProgress >= 0) {
      const pos = getOpenPosition(currentKnots, particleProgress);
      const fade = Math.pow(1 - i / (trailCount + 1), 1.25);
      const size = Math.max(1.4, 6.5 - i * 0.28);

      trailParticles.push({
        x: pos.x,
        y: pos.y,
        opacity: masterOpacity * fade * 0.88,
        size,
        color: trailColors[i % trailColors.length],
        blur: i < 5 ? 0.8 : i < 11 ? 1.5 : 2.2,
      });
    }
  }

  if (masterOpacity <= 0.005) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible select-none"
      style={{ opacity: masterOpacity }}
    >
      {/* 1. Subtle Center Nexus Glint when Crossing the 'X' (x: 50%, y: 50%) */}
      {nexusGlow > 0 && (
        <div
          className="absolute rounded-full pointer-events-none blur-[2px]"
          style={{
            left: '50%',
            top: '50%',
            width: '14px',
            height: '14px',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(254, 240, 138, 0.7) 45%, rgba(245, 158, 11, 0.2) 75%, transparent 100%)',
            opacity: nexusGlow,
          }}
        />
      )}

      {/* 2. Long Luminous Smoky Stardust Wake crossing like an X */}
      {trailParticles.map((pt, idx) => (
        <div
          key={idx}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${pt.x}%`,
            top: `${pt.y}%`,
            width: `${pt.size}px`,
            height: `${pt.size}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: pt.color,
            opacity: pt.opacity,
            filter: `blur(${pt.blur}px)`,
            boxShadow: `0 0 ${pt.size * 1.8}px ${pt.color}`,
          }}
        />
      ))}

      {/* 3. Soft Radiant Glow around the star head */}
      <div
        className="absolute rounded-full pointer-events-none blur-[2px]"
        style={{
          left: `${headPos.x}%`,
          top: `${headPos.y}%`,
          width: '16px',
          height: '16px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(254, 240, 138, 0.75) 40%, rgba(245, 158, 11, 0.3) 70%, transparent 100%)',
          boxShadow: '0 0 8px rgba(251, 191, 36, 0.75)',
        }}
      />

      {/* 4. Small, Brilliant 4-Point Gold & Diamond Star */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${headPos.x}%`,
          top: `${headPos.y}%`,
          width: '11px',
          height: '11px',
          transform: `translate(-50%, -50%) rotate(${starRotation}deg) scale(${twinkle})`,
          transition: 'transform 0.04s linear',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full filter drop-shadow-[0_0_5px_rgba(255,251,235,1)]"
        >
          <defs>
            <radialGradient id="ebSmallSparkleGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#FEF08A" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          {/* Classic 4-point concave diamond sparkle star */}
          <path
            d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
            fill="url(#ebSmallSparkleGrad)"
          />
          {/* Diamond bright center glint */}
          <circle cx="12" cy="12" r="2.8" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );
}

const GoogleFlowGoldSparkle = XCrossShootingStar;

export default function EBazirganLogo({
  size = 38,
  className = '',
  showText = false,
  textColor = 'text-white dark:text-amber-300',
  variant = 'badge',
  withBackground = false,
  useAsset = true,
}: EBazirganLogoProps) {
  const isFull = variant === 'full' || showText;
  const badgeSize = typeof size === 'number' ? `${size}px` : size;

  // Render the exact official 3D image asset directly by default
  if (useAsset === true) {
    const numSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 38;
    const badgeHeight = typeof size === 'number' ? `${numSize}px` : size;
    const badgeWidth = typeof size === 'number' ? `${Math.round(numSize * (isFull ? 1.4 : 1.38))}px` : size;
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <div
          className="relative inline-flex items-center justify-center shrink-0 rounded-xl group overflow-visible transition-transform duration-200 hover:scale-105"
          style={{ width: badgeWidth, height: badgeHeight }}
        >
          {/* Official 3D Monogram Emblem */}
          <img
            src={isFull ? officialFullLogoAsset : (officialLogoAsset || officialLogoJpg)}
            alt="E-Bazirgan Official Logo"
            className="w-full h-full object-contain select-none drop-shadow-[0_1px_8px_rgba(251,191,36,0.35)]"
            referrerPolicy="no-referrer"
          />
          {/* Real Gold Sparkle - Minimalist Google Flow */}
          <GoogleFlowGoldSparkle />
        </div>
        {isFull && (
          <span className={`text-base font-black tracking-tight ${textColor}`}>
            Ɛ-Bazirgan
          </span>
        )}
      </div>
    );
  }

  // Pure SVG Vector emblem: Exact proportions, deep navy "E", vibrant 24K gold "B"
  const viewBox = isFull ? '50 35 375 315' : '55 40 365 255';
  const numSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 38;
  const aspectRatio = isFull ? 375 / 315 : 365 / 255;
  const width = typeof size === 'number' ? Math.round(numSize * aspectRatio) : size;
  const height = typeof size === 'number' ? numSize : size;

  return (
    <div className={`relative inline-flex items-center select-none overflow-visible rounded-xl ${className}`}>
      <svg
        viewBox={viewBox}
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 drop-shadow-[0_1px_8px_rgba(251,191,36,0.35)]"
      >
        <defs>
          {/* =================================================================== */}
          {/* 1. DEEP NAVY BLUE GRADIENTS (FOR LETTER 'E' - "نیلی تۆخ")            */}
          {/* =================================================================== */}
          <linearGradient id="ebNavySurface" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#1E446E" />
            <stop offset="25%" stopColor="#12355A" />
            <stop offset="55%" stopColor="#0A2542" />
            <stop offset="85%" stopColor="#06192E" />
            <stop offset="100%" stopColor="#030E1B" />
          </linearGradient>

          <linearGradient id="ebNavyHighlight" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#38BDF8" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#1D4ED8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0A2542" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="ebNavyInnerBevel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#1E3A8A" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#0284C7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="ebNavyShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0A2542" />
            <stop offset="60%" stopColor="#041221" />
            <stop offset="100%" stopColor="#01060C" />
          </linearGradient>

          {/* =================================================================== */}
          {/* 2. RICH 24K RADIANT GOLD GRADIENTS (FOR LETTER 'B' - "زیاتر گۆڵد")   */}
          {/* =================================================================== */}
          <linearGradient id="ebGoldSurface" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="12%" stopColor="#FEF08A" />
            <stop offset="30%" stopColor="#FCD34D" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#D97706" />
            <stop offset="90%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          <linearGradient id="ebGoldHighlight" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#FBBF24" />
            <stop offset="85%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#854D0E" />
          </linearGradient>

          <linearGradient id="ebGoldShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#B45309" />
            <stop offset="80%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>

          {/* =================================================================== */}
          {/* 3. TRANSITION RIBBON GRADIENT (NAVY -> GOLD)                        */}
          {/* =================================================================== */}
          <linearGradient id="ebRibbonTransition" x1="160" y1="260" x2="270" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0A2542" />
            <stop offset="40%" stopColor="#1E3A8A" />
            <stop offset="65%" stopColor="#B45309" />
            <stop offset="85%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FEF08A" />
          </linearGradient>

          {/* =================================================================== */}
          {/* 4. 3D EMBOSSING & AMBIENT SHADOW FILTER                             */}
          {/* =================================================================== */}
          <filter id="ebBevelShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#020617" floodOpacity="0.45" />
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.30" />
          </filter>

          {/* Background Ambient Glow */}
          <radialGradient id="ebBgGlow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>

        {/* Optional Brushed Plate Background */}
        {withBackground && (
          <rect
            x="40"
            y="25"
            width="390"
            height={isFull ? '325' : '265'}
            rx="24"
            fill="url(#ebBgGlow)"
            stroke="#334155"
            strokeWidth="1.5"
          />
        )}

        <g filter="url(#ebBevelShadow)">
          {/* =================================================================== */}
          {/* A. 3D BASE EXTRUSIONS (GROUND DEPTH)                                */}
          {/* =================================================================== */}
          {/* Base Shadow for Navy E */}
          <path
            d="M 220 54
               C 155 54, 108 72, 85 110
               C 70 134, 72 158, 92 174
               C 70 190, 68 214, 85 238
               C 108 276, 155 294, 215 294
               L 255 294
               L 255 258
               L 215 258
               C 175 258, 142 248, 128 226
               C 118 210, 122 196, 138 186
               C 152 176, 178 174, 225 174
               L 255 174
               L 255 142
               L 225 142
               C 178 142, 152 140, 138 130
               C 122 120, 118 106, 128 90
               C 142 68, 175 58, 215 58
               Z"
            transform="translate(0, 4)"
            fill="url(#ebNavyShadow)"
          />

          {/* Base Shadow for Gold B */}
          <g transform="matrix(0.8219 0 0 0.8219 48 13.26)">
            <path
              d="M 265 52
                 C 315 52, 362 64, 394 92
                 C 418 114, 426 142, 412 170
                 C 400 192, 376 204, 348 210
                 C 382 216, 410 232, 420 260
                 C 432 296, 404 330, 362 338
                 C 328 344, 280 344, 240 324
                 L 255 288
                 C 285 304, 322 306, 350 300
                 C 372 296, 384 278, 376 260
                 C 368 240, 345 230, 305 230
                 L 255 230
                 L 255 160
                 L 305 160
                 C 340 160, 364 152, 370 136
                 C 376 122, 366 108, 348 100
                 C 326 92, 290 90, 255 90
                 Z"
              fill="url(#ebGoldShadow)"
            />
          </g>

          {/* =================================================================== */}
          {/* B. THE 'E' LETTER (DEEP DARK NAVY BLUE - "نیلی تۆخ")                 */}
          {/* =================================================================== */}
          {/* Outer Main Beveled Body of E */}
          <path
            d="M 220 52
               C 155 52, 108 70, 85 108
               C 70 132, 72 156, 92 172
               C 70 188, 68 212, 85 236
               C 108 274, 155 292, 215 292
               L 255 292
               L 255 254
               L 215 254
               C 175 254, 142 244, 128 222
               C 118 206, 122 192, 138 182
               C 152 172, 178 170, 225 170
               L 255 170
               L 255 138
               L 225 138
               C 178 138, 152 136, 138 126
               C 122 116, 118 102, 128 86
               C 142 64, 175 54, 215 54
               Z"
            fill="url(#ebNavySurface)"
            stroke="url(#ebNavyHighlight)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Signature 3D Interior Contour Bevel on Navy E */}
          <path
            d="M 215 62
               C 162 62, 122 76, 102 108
               C 88 128, 90 148, 108 162
               C 88 178, 86 198, 102 218
               C 122 250, 162 264, 215 264
               L 245 264"
            fill="none"
            stroke="url(#ebNavyInnerBevel)"
            strokeWidth="2.2"
            strokeOpacity="0.85"
          />

          {/* Upper Loop Inner Pill Hollow in Navy E */}
          <path
            d="M 172 90
               C 192 90, 210 96, 214 112
               C 218 126, 204 136, 180 138
               L 146 138
               C 134 132, 132 122, 138 110
               C 144 98, 156 90, 172 90
               Z"
            fill="#051528"
            stroke="url(#ebNavyHighlight)"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />

          {/* Lower Loop Inner Pill Hollow in Navy E */}
          <path
            d="M 172 206
               C 192 206, 210 212, 214 228
               C 218 242, 204 252, 180 254
               L 146 254
               C 134 248, 132 238, 138 226
               C 144 214, 156 206, 172 206
               Z"
            fill="#051528"
            stroke="url(#ebNavyHighlight)"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />

          {/* Dynamic Interconnecting S-Ribbon flowing from Navy E into Gold B */}
          <path
            d="M 185 268
               C 215 268, 240 255, 255 235
               C 268 218, 272 195, 260 178
               C 252 166, 238 160, 225 158"
            fill="none"
            stroke="url(#ebRibbonTransition)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* =================================================================== */}
          {/* C. THE 'B' LETTER (RICH 24K RADIANT GOLD - "زیاتر گۆڵد")            */}
          {/* =================================================================== */}
          <g transform="matrix(0.8219 0 0 0.8219 48 9.26)">
            {/* Main Sculpted Body of B in Vibrant 24K Gold */}
            <path
              d="M 265 52
                 C 315 52, 362 64, 394 92
                 C 418 114, 426 142, 412 170
                 C 400 192, 376 204, 348 210
                 C 382 216, 410 232, 420 260
                 C 432 296, 404 330, 362 338
                 C 328 344, 280 344, 240 324
                 L 255 288
                 C 285 304, 322 306, 350 300
                 C 372 296, 384 278, 376 260
                 C 368 240, 345 230, 305 230
                 L 255 230
                 L 255 160
                 L 305 160
                 C 340 160, 364 152, 370 136
                 C 376 122, 366 108, 348 100
                 C 326 92, 290 90, 255 90
                 Z"
              fill="url(#ebGoldSurface)"
              stroke="url(#ebGoldHighlight)"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Inset Border Channel on Gold B */}
            <path
              d="M 275 62
                 C 318 62, 358 72, 385 96
                 C 406 115, 412 138, 400 162
                 C 386 190, 356 200, 320 206
                 C 356 212, 390 224, 398 250
                 C 408 280, 385 308, 348 316
                 C 318 322, 275 322, 245 306"
              fill="none"
              stroke="#FFFBEB"
              strokeWidth="2.2"
              strokeOpacity="0.85"
            />

            {/* Lower Loop Hollow Inside Gold B */}
            <path
              d="M 305 242
                 C 336 242, 368 248, 374 266
                 C 380 282, 366 296, 340 300
                 C 318 304, 288 302, 268 292
                 L 272 268
                 C 285 274, 300 276, 314 274
                 C 326 272, 334 266, 330 258
                 C 326 250, 314 248, 296 248
                 Z"
              fill="none"
              stroke="url(#ebGoldShadow)"
              strokeWidth="3"
            />

            {/* =================================================================== */}
            {/* WI-FI DIGITAL BROADCAST SIGNAL (INSIDE UPPER 'B' LOOP) - 24K GOLD   */}
            {/* =================================================================== */}
            {/* Central Node Dot */}
            <circle
              cx="350"
              cy="148"
              r="8.5"
              fill="url(#ebGoldSurface)"
              stroke="#78350F"
              strokeWidth="1.5"
            />
            <circle cx="350" cy="148" r="3.2" fill="#FFFFFF" />

            {/* First Concentric Wave Arc */}
            <path
              d="M 330 132 C 340 120, 360 120, 370 132"
              fill="none"
              stroke="url(#ebGoldSurface)"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
            <path
              d="M 330 132 C 340 120, 360 120, 370 132"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.9"
            />

            {/* Second Outer Concentric Wave Arc */}
            <path
              d="M 314 114 C 332 93, 368 93, 386 114"
              fill="none"
              stroke="url(#ebGoldSurface)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M 314 114 C 332 93, 368 93, 386 114"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeOpacity="0.95"
            />
          </g>

          {/* =================================================================== */}
          {/* D. STRATEGIC SPECULAR STAR SPARKLES (MATCHING REFERENCE LUXURY)     */}
          {/* =================================================================== */}
          {/* Sparkle 1: Crest of Golden B */}
          <g transform="translate(376, 78)">
            <ellipse cx="0" cy="0" rx="15" ry="2" fill="#FFFFFF" opacity="0.95" />
            <ellipse cx="0" cy="0" rx="2" ry="15" fill="#FFFFFF" opacity="0.95" />
            <polygon
              points="0,-16 3.2,-3.2 16,0 3.2,3.2 0,16 -3.2,3.2 -16,0 -3.2,-3.2"
              fill="#FFFFFF"
            />
            <circle cx="0" cy="0" r="3.2" fill="#FEF08A" />
          </g>

          {/* Sparkle 2: Lower Right Curve of B */}
          <g transform="translate(395, 236)">
            <polygon
              points="0,-12 2.2,-2.2 12,0 2.2,2.2 0,12 -2.2,2.2 -12,0 -2.2,-2.2"
              fill="#FFFFFF"
              opacity="0.95"
            />
            <circle cx="0" cy="0" r="2.4" fill="#FFFBEB" />
          </g>

          {/* Sparkle 3: Crisp Cyan-White Glint on Navy E Shoulder */}
          <g transform="translate(132, 62)">
            <polygon
              points="0,-13 2.5,-2.5 13,0 2.5,2.5 0,13 -2.5,2.5 -13,0 -2.5,-2.5"
              fill="#BAE6FD"
              opacity="0.95"
            />
            <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
          </g>

          {/* =================================================================== */}
          {/* E. TYPOGRAPHY 'Ɛ-Bazirgan' (SHOWN WHEN VARIANT='FULL' / SHOWTEXT)     */}
          {/* =================================================================== */}
          {isFull && (
            <g transform="translate(240, 328)">
              {/* Subtle drop shadow text */}
              <text
                x="0"
                y="1"
                textAnchor="middle"
                fontSize="42"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
                fill="#000000"
                fillOpacity="0.25"
                letterSpacing="0.04em"
              >
                Ɛ-Bazirgan
              </text>
              {/* Main Navy Typography */}
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="42"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
                fill="url(#ebNavySurface)"
                stroke="#0A2542"
                strokeWidth="0.8"
                letterSpacing="0.04em"
              >
                Ɛ-Bazirgan
              </text>
            </g>
          )}
        </g>
      </svg>
      {/* Real Gold Sparkle - Minimalist Google Flow */}
      <GoogleFlowGoldSparkle />
    </div>
  );
}
