import { db } from './db';

export const dbClient = {
  database: {
    from: (table: string) => {
      return {
        insert: async (item: any) => {
          if (table === 'marketplaceItems') {
            await db.addMarketplaceItem({
              userId: item.userId,
              userName: item.userName,
              userAvatar: item.userAvatar || '',
              title: item.title,
              description: item.description,
              price: item.price,
              shippingPrice: item.shippingPrice || 0,
              imageUrl: item.imageUrl,
              imageUrls: item.imageUrls || [],
              videoUrl: item.videoUrl || '',
              audioUrl: item.audioUrl || '',
              audioMetadata: item.audioMetadata || null,
              category: item.category,
              location: item.location || '',
              sizes: item.sizes || [],
              colors: item.colors || [],
              weight: item.weight || '',
              rating: item.rating || 4.5,
              reviewCount: item.reviewCount || 1,
              isPublic: item.isPublic !== false,
              moderationStatus: item.moderationStatus || 'approved',
              postType: item.postType || 'marketplace',
              productKind: item.productKind || 'sale',
              analytics: item.analytics || { views: 0, uniqueVisitors: 0, sales: 0, revenue: 0 },
              customFields: item.customFields || {},
              features: item.features || [],
              variants: item.variants || [],
            });
          }
          return { error: null };
        }
      };
    }
  }
};
