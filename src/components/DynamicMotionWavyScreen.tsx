import React from 'react';
import clsx from 'clsx';
import luxuryDarkGoldDesktop from '../assets/images/luxury_dark_gold_1789393802846.jpg';
import luxuryDarkGoldPortrait from '../assets/images/luxury_gold_portrait_1789393839523.jpg';
import bwGoldDesktop from '../assets/images/bw_gold_desktop_1789463551914.jpg';
import bwGoldPortrait from '../assets/images/bw_gold_portrait_1789463539301.jpg';

interface DynamicMotionWavyScreenProps {
  theme?: string;
  className?: string;
}

export const DynamicMotionWavyScreen: React.FC<DynamicMotionWavyScreenProps> = ({
  theme = 'royal',
  className,
}) => {
  // Pure Clean White Unified Canvas - only when explicitly selected
  if (theme === 'white' || theme === 'light') {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-white",
          className
        )}
      >
        {/* Pure Solid White Foundation */}
        <div className="absolute inset-0 bg-white" />
      </div>
    );
  }

  // 1. ⚪ High-Contrast Monochrome & 24K Gold Ribbon Canvas (Matching user's reference wallpaper):
  // - Pure, crisp white negative space background
  // - Flowing sculptural aerodynamic ribbon in liquid obsidian black, platinum silver, and metallic charcoal
  // - Luminous razor-thin 24K gold blush border lines tracing the sweeps
  if (theme === 'bw_gold' || theme === 'monochrome') {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-white",
          className
        )}
      >
        {/* Base Pure White Foundation */}
        <div className="absolute inset-0 bg-[#fdfdfd]" />

        {/* High-Definition Obsidian & Gold Ribbon Canvas Assets */}
        {/* Desktop / Landscape Aspect Ratio */}
        <div className="hidden sm:block absolute inset-0 w-full h-full">
          <img
            src={bwGoldDesktop}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-95"
          />
        </div>
        {/* Mobile / Portrait Aspect Ratio */}
        <div className="block sm:hidden absolute inset-0 w-full h-full">
          <img
            src={bwGoldPortrait}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-95"
          />
        </div>

        {/* Crisp White Translucent Readability Veil */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.3) 100%)'
          }}
        />

        {/* Subtle SVG Accent for 24K Gold Curving Line Gleam */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="bwGoldShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="30%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FFFBEB" />
              <stop offset="70%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
          <path
            d="M 600 -10 C 720 180, 800 380, 750 560 C 700 740, 520 860, 420 1020"
            fill="none"
            stroke="url(#bwGoldShine)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="animate-gold-ribbon-gleam"
          />
        </svg>
      </div>
    );
  }

  // 2. 👑 Luxury Dark Theme (Matching user reference):
  // - Top-right: Velvety midnight royal navy & indigo satin with subtle vertical sheen
  // - Sweeping S-curve ribbon: Polished 24K reflective gold with specular highlights and bevel
  // - Bottom-left: Deep obsidian black silk drapery folds with warm amber ambient reflections
  // - High contrast, pristine text legibility, no stars
  if (theme === 'dark' || theme === 'royal' || theme === 'luxury' || theme === 'gold' || theme === 'midnight') {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#030308]",
          className
        )}
      >
        {/* 1. Deep Obsidian & Midnight Navy Base Foundation */}
        <div className="absolute inset-0 bg-[#030308]" />

        {/* 2. Photorealistic High-Definition Silk & 24K Gold Ribbon Canvas Assets */}
        {/* Desktop / Landscape Aspect Ratio */}
        <div className="hidden sm:block absolute inset-0 w-full h-full">
          <img
            src={luxuryDarkGoldDesktop}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-95"
          />
        </div>
        {/* Mobile / Portrait Aspect Ratio (Phone Screen) */}
        <div className="block sm:hidden absolute inset-0 w-full h-full">
          <img
            src={luxuryDarkGoldPortrait}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-95"
          />
        </div>

        {/* 3. Deep Midnight Navy & Indigo Satin Upper Sheen Overlay */}
        <div
          className="absolute -inset-[10%] pointer-events-none opacity-60 animate-satin-pulse mix-blend-screen"
          style={{
            background: `
              radial-gradient(ellipse 900px 700px at 85% 20%, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.25) 45%, transparent 75%),
              linear-gradient(105deg, transparent 40%, rgba(99, 102, 241, 0.08) 60%, rgba(168, 85, 247, 0.05) 75%, transparent 90%)
            `,
          }}
        />

        {/* 4. Rich Obsidian Silk Drape Shadow Overlay (Bottom-Left Depth) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-75"
          style={{
            background: `
              linear-gradient(135deg, rgba(2, 2, 5, 0.88) 0%, rgba(4, 4, 10, 0.6) 35%, transparent 65%),
              radial-gradient(ellipse 800px 600px at 15% 85%, rgba(2, 2, 6, 0.92) 0%, rgba(15, 10, 4, 0.4) 50%, transparent 80%)
            `,
          }}
        />

        {/* 5. Precision SVG Vector Enhancement for the 24K Gold Ribbon */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <defs>
            {/* 24K Gold Multi-stop Specular Gradient */}
            <linearGradient id="luxuryGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="25%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#FDE047" />
              <stop offset="75%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            {/* Specular White-Gold Gleam Gradient */}
            <linearGradient id="luxuryGoldShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#FFFBEB" />
              <stop offset="60%" stopColor="#FEF08A" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Ambient Gold Glow Filter */}
            <filter id="luxuryGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Deep Amber Soft Under-Glow tracing the curve */}
          <path
            d="M 50 -10 C 20 180, 20 320, 220 480 C 440 660, 720 780, 1030 920"
            fill="none"
            stroke="#D97706"
            strokeWidth="24"
            opacity="0.35"
            filter="url(#luxuryGoldGlow)"
          />

          {/* Core Polished 24K Gold Curved Ribbon */}
          <path
            d="M 50 -10 C 20 180, 20 320, 220 480 C 440 660, 720 780, 1030 920"
            fill="none"
            stroke="url(#luxuryGoldGradient)"
            strokeWidth="9"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Razor-thin Specular Highlight Ridge */}
          <path
            d="M 50 -10 C 20 180, 20 320, 220 480 C 440 660, 720 780, 1030 920"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            opacity="0.85"
          />

          {/* Animated Traveling Light Glint along the Gold Ribbon */}
          <path
            d="M 50 -10 C 20 180, 20 320, 220 480 C 440 660, 720 780, 1030 920"
            fill="none"
            stroke="url(#luxuryGoldShine)"
            strokeWidth="5"
            strokeDasharray="180 800"
            className="animate-gold-ribbon-gleam"
          />
        </svg>

        {/* 6. Soft Luxury Contrast Vignette - Preserves crisp text and card readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(2, 2, 6, 0.65) 100%)',
          }}
        />
      </div>
    );
  }

  // 3. 🌅 Golden Sunset (Warm twilight amber, rose, and purple fluid waves)
  if (theme === 'sunset') {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#120414]",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c0820] via-[#120414] to-[#0a020c]" />
        
        {/* Warm Golden Sunset Radial Ambient Spheres */}
        <div 
          className="absolute -inset-[15%] w-[130%] h-[130%] pointer-events-none animate-satin-pulse opacity-75"
          style={{
            background: `
              radial-gradient(circle 700px at 80% 20%, rgba(249, 115, 22, 0.40) 0%, transparent 65%),
              radial-gradient(circle 650px at 20% 75%, rgba(225, 29, 72, 0.35) 0%, transparent 65%),
              radial-gradient(circle 600px at 50% 50%, rgba(168, 85, 247, 0.25) 0%, transparent 65%)
            `
          }}
        />

        {/* Ambient Glowing Sunset Wave SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sunsetWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <path
            d="M -50 400 C 250 250, 450 650, 750 400 C 900 280, 1000 350, 1100 450"
            fill="none"
            stroke="url(#sunsetWaveGrad)"
            strokeWidth="12"
            opacity="0.5"
            className="animate-gold-ribbon-gleam"
          />
        </svg>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      </div>
    );
  }

  // 4. 🌃 Tokyo Cyber Night (Deep midnight indigo, neon cyan & magenta waves)
  if (theme === 'tokyo') {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#070514]",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0724] via-[#070514] to-[#03020a]" />

        {/* Electric Neon Cyan & Magenta Ambient Waves */}
        <div 
          className="absolute -inset-[15%] w-[130%] h-[130%] pointer-events-none animate-satin-pulse opacity-70"
          style={{
            background: `
              radial-gradient(circle 650px at 75% 25%, rgba(6, 182, 212, 0.35) 0%, transparent 65%),
              radial-gradient(circle 600px at 25% 75%, rgba(168, 85, 247, 0.35) 0%, transparent 65%),
              radial-gradient(circle 500px at 50% 50%, rgba(99, 102, 241, 0.25) 0%, transparent 65%)
            `
          }}
        />

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="tokyoNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path
            d="M 0 300 C 300 150, 400 550, 800 350 C 950 280, 1050 400, 1150 350"
            fill="none"
            stroke="url(#tokyoNeonGrad)"
            strokeWidth="10"
            opacity="0.6"
            className="animate-gold-ribbon-gleam"
          />
        </svg>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      </div>
    );
  }

  // 5. 🌌 Aurora Borealis (Northern lights - Deep emerald, cyan, and teal glowing curtains)
  if (theme === 'aurora' || theme === 'emerald') {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#03110d]",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#051c15] via-[#03110d] to-[#010705]" />

        {/* Northern Lights Luminous Green & Teal Curtains */}
        <div 
          className="absolute -inset-[15%] w-[130%] h-[130%] pointer-events-none animate-satin-pulse opacity-75"
          style={{
            background: `
              radial-gradient(circle 700px at 70% 20%, rgba(16, 185, 129, 0.38) 0%, transparent 65%),
              radial-gradient(circle 650px at 30% 70%, rgba(6, 182, 212, 0.32) 0%, transparent 65%),
              radial-gradient(circle 550px at 50% 40%, rgba(52, 211, 153, 0.25) 0%, transparent 65%)
            `
          }}
        />

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="auroraGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <path
            d="M 50 150 C 200 350, 450 100, 700 400 C 850 550, 950 300, 1050 450"
            fill="none"
            stroke="url(#auroraGlowGrad)"
            strokeWidth="14"
            opacity="0.5"
            className="animate-gold-ribbon-gleam"
          />
        </svg>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/55 via-transparent to-black/30" />
      </div>
    );
  }

  // 6. 🌊 Dynamic Motion Wavy (Champagne beige, gold, and teal fluid waves)
  if (theme === 'wavy') {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#f8f6f0]",
          className
        )}
      >
        <div className="absolute inset-0 bg-[#faf8f4]" />

        {/* Elegant Fluid Teal & Gold Motion Waves */}
        <div 
          className="absolute -inset-[20%] w-[140%] h-[140%] pointer-events-none animate-rainbow-dynamic-1"
          style={{
            background: `
              radial-gradient(circle 650px at 20% 25%, rgba(20, 184, 166, 0.22) 0%, transparent 60%),
              radial-gradient(circle 600px at 80% 20%, rgba(245, 158, 11, 0.25) 0%, transparent 60%),
              radial-gradient(circle 700px at 50% 60%, rgba(13, 148, 136, 0.18) 0%, transparent 65%),
              radial-gradient(circle 650px at 75% 85%, rgba(251, 191, 36, 0.22) 0%, transparent 60%)
            `
          }}
        />

        <div 
          className="absolute -inset-[20%] w-[140%] h-[140%] pointer-events-none animate-rainbow-dynamic-2 opacity-70"
          style={{
            background: `
              radial-gradient(circle 580px at 70% 30%, rgba(45, 212, 191, 0.20) 0%, transparent 58%),
              radial-gradient(circle 550px at 30% 70%, rgba(217, 119, 6, 0.18) 0%, transparent 58%)
            `
          }}
        />

        {/* Subtle grid and smooth diffusion */}
        <div 
          className="absolute inset-0 pointer-events-none backdrop-blur-[6px]"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(250, 248, 244, 0.3) 0%, rgba(250, 248, 244, 0.1) 100%)'
          }}
        />
      </div>
    );
  }

  // 7. 🌈 Light Rainbow Canvas with Smooth Dynamic Colour Change (NO SPIRAL - لولپێچەکە لابرا)
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#fbfaf8]",
        className
      )}
    >
      {/* 1. Primary Smooth Dynamic Rainbow Flow */}
      <div 
        className="absolute -inset-[20%] w-[140%] h-[140%] pointer-events-none animate-rainbow-dynamic-1"
        style={{
          background: `
            radial-gradient(circle 620px at 15% 15%, rgba(254, 165, 177, 0.65) 0%, transparent 64%),
            radial-gradient(circle 640px at 85% 18%, rgba(253, 224, 71, 0.60) 0%, transparent 64%),
            radial-gradient(circle 700px at 50% 50%, rgba(134, 239, 172, 0.58) 0%, transparent 66%),
            radial-gradient(circle 660px at 82% 82%, rgba(125, 211, 252, 0.65) 0%, transparent 64%),
            radial-gradient(circle 620px at 18% 85%, rgba(216, 180, 254, 0.68) 0%, transparent 64%)
          `
        }}
      />

      {/* 2. Secondary Counter-Cycling Fluid Rainbow Wave */}
      <div 
        className="absolute -inset-[20%] w-[140%] h-[140%] pointer-events-none animate-rainbow-dynamic-2"
        style={{
          background: `
            radial-gradient(circle 590px at 75% 25%, rgba(103, 232, 249, 0.60) 0%, transparent 60%),
            radial-gradient(circle 560px at 25% 72%, rgba(253, 186, 116, 0.62) 0%, transparent 60%),
            radial-gradient(circle 540px at 50% 12%, rgba(252, 211, 77, 0.55) 0%, transparent 58%),
            radial-gradient(circle 560px at 50% 88%, rgba(244, 114, 182, 0.58) 0%, transparent 60%)
          `
        }}
      />

      {/* 3. Ambient Pastel Aurora Light Pulse */}
      <div 
        className="absolute inset-0 pointer-events-none animate-rainbow-dynamic-mesh"
        style={{
          background: `
            radial-gradient(ellipse 95% 75% at 50% 25%, rgba(251, 146, 60, 0.18) 0%, transparent 70%),
            radial-gradient(ellipse 85% 65% at 50% 75%, rgba(168, 85, 247, 0.20) 0%, transparent 70%)
          `
        }}
      />

      {/* 4. Fine Paper/Canvas Grid Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1e293b 1px, transparent 1px),
            linear-gradient(to bottom, #1e293b 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      {/* 5. Frosted Translucent Silk Diffusion for Eye-Safe Reading */}
      <div 
        className="absolute inset-0 pointer-events-none backdrop-blur-[9px]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(251, 250, 248, 0.25) 0%, rgba(251, 250, 248, 0.12) 100%)'
        }}
      />
    </div>
  );
};

export default DynamicMotionWavyScreen;
