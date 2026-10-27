export type TimeTheme = 'rainbow' | 'wavy' | 'navy' | 'monochrome' | 'sunset' | 'tokyo' | 'aurora';

export interface LocalTimeThemeInfo {
  theme: 'rainbow' | 'wavy' | 'navy' | 'monochrome';
  period: 'daytime' | 'sunset' | 'night';
  periodLabelKu: string;
  periodLabelAr: string;
  periodLabelEn: string;
  hour: number;
  formattedTime: string;
  icon: string;
  descriptionKu: string;
  descriptionEn: string;
}

/**
 * Detects current local time theme setting.
 */
export function detectLocalTimeTheme(date: Date = new Date()): LocalTimeThemeInfo {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const formattedTime = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return {
    theme: 'wavy',
    period: 'daytime',
    periodLabelKu: 'بێج و گۆڵد (شەپۆلاوی ئاڵتوونی)',
    periodLabelAr: 'بيج وذهبي ملكي (أمواج ذهبية)',
    periodLabelEn: 'Beige & Gold Luxury Waves',
    hour,
    formattedTime,
    icon: '✨',
    descriptionKu: 'ستیلی شاهانەی بێج و گۆڵد بە شەپۆلی ئاڵتوونی نەرم',
    descriptionEn: 'Luxurious champagne beige and metallic gold dynamic waves'
  };
}
