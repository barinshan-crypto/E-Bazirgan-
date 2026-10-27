// Platform Smart Recommendation & Engagement Algorithm Engine
// Provides dynamic AI-powered sorting for products, live streams, and sellers based on engagement, recency, location, and popularity.

export interface EngagementMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  salesCount?: number;
  createdAt?: number;
  location?: string;
  isBoosted?: boolean;
}

/**
 * Calculates a recommendation score for a marketplace product or item.
 */
export function calculateItemScore(item: any, userCity?: string): number {
  let score = 0;

  // 1. Recency Decay Score (Fresh content ranks higher)
  const ageInHours = (Date.now() - (item.createdAt || Date.now())) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 100 - ageInHours * 2);
  score += recencyScore;

  // 2. Engagement Metrics Weighting
  const likesCount = Array.isArray(item.likes) ? item.likes.length : (typeof item.likes === 'number' ? item.likes : 0);
  const viewsCount = item.viewsCount || item.views || 0;
  const rating = item.rating || 5;

  score += likesCount * 15;
  score += viewsCount * 2;
  score += rating * 10;

  // 3. Location / City Match Boost
  if (userCity && item.location && userCity !== 'All') {
    if (item.location.toLowerCase() === userCity.toLowerCase()) {
      score += 50;
    }
  }

  // 4. Boosted / Promoted Item Priority
  if (item.isBoosted || item.isBumped) {
    score += 300;
  }

  return score;
}

/**
 * Ranks marketplace items using the platform recommendation algorithm.
 */
export function rankMarketplaceItems(items: any[], userCity?: string): any[] {
  return [...items].sort((a, b) => {
    const scoreA = calculateItemScore(a, userCity);
    const scoreB = calculateItemScore(b, userCity);
    return scoreB - scoreA;
  });
}

/**
 * Calculates a real-time recommendation score for live video streams.
 */
export function calculateLiveSessionScore(session: any, userCity?: string): number {
  const isLive = session.status === 'live' && !session.isReplay;
  let score = isLive ? 10000 : 500; // Live broadcasts rank higher than replays

  // 1. Viewer Count & Audience Engagement
  const viewers = session.viewerCount || 0;
  score += viewers * 20;

  // 2. Recency (New live streams or recent replays get immediate push)
  const timestamp = session.endedAt || session.createdAt || Date.now();
  const streamAgeMinutes = (Date.now() - timestamp) / (1000 * 60);
  score += Math.max(0, 300 - streamAgeMinutes * 2);

  // 3. Pinned Product Multiplier (Streams with buyable products rank higher)
  if (session.pinnedProductId || session.featuredTitle || (session.products && session.products.length > 0)) {
    score += 150;
  }

  // 4. City Proximity Boost
  if (userCity && session.location && userCity !== 'All') {
    if (session.location.toLowerCase().includes(userCity.toLowerCase())) {
      score += 100;
    }
  }

  return score;
}

/**
 * Ranks live streaming sessions dynamically.
 */
export function rankLiveSessions(sessions: any[], userCity?: string): any[] {
  return [...sessions].sort((a, b) => {
    const scoreA = calculateLiveSessionScore(a, userCity);
    const scoreB = calculateLiveSessionScore(b, userCity);
    return scoreB - scoreA;
  });
}
