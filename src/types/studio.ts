export type ProductCategory = 'apparel' | 'footwear' | 'gear';

export type AspectRatioOption = '1:1' | '4:5' | '9:16';

export type PresetId =
  | 'original'
  | 'clean-store'
  | 'alpine-crisp'
  | 'trail-warm'
  | 'studio-deep'
  | 'outdoor-film';

export type OverlayTemplateId = 'clean' | 'editorial' | 'poster' | 'spec';

export interface PhotoAdjustments {
  brightness: number; // -40 to 40
  contrast: number; // -40 to 40
  saturation: number; // -40 to 40
  warmth: number; // -30 to 30
  sharpness: number; // 0 to 50
  vignette: number; // 0 to 50
}

export interface CropTransform {
  zoom: number; // 1 to 2.4
  offsetX: number; // -1 to 1 normalized
  offsetY: number; // -1 to 1 normalized
  rotation: number; // -15 to 15 deg
}

export interface OverlayConfig {
  template: OverlayTemplateId;
  headline: string;
  subcopy: string;
  badgeText: string;
  showStoreMark: boolean;
  theme: 'dark' | 'light';
  fontScale: number; // 0.85 to 1.25
}

export interface CategoryQuestion {
  id: string;
  question: string;
  placeholder: string;
  quickOptions: string[];
}

export interface OverlaySuggestion {
  headline: string;
  subcopy: string;
}

export interface CaptionVariant {
  style: string;
  title: string;
  body: string;
  cta: string;
}

export interface MarketingResult {
  overlaySuggestions: OverlaySuggestion[];
  captions: CaptionVariant[];
  hashtags: string[];
  postingTip: string;
}

export interface PhotoAnalysisResult {
  detectedCategory: ProductCategory;
  detectedProduct: string;
  recommendedPreset: PresetId;
  suggestedAdjustments: PhotoAdjustments;
  retouchReason: string;
  suggestedHeadline: string;
  suggestedSubcopy: string;
}

export interface SamplePhoto {
  id: string;
  label: string;
  category: ProductCategory;
  productName: string;
  src: string;
}

export type HashtagStrategy = 'balanced' | 'local' | 'search';

export interface HashtagGroupItem {
  tag: string;
  group: 'storeAndLocal' | 'brandAndProduct' | 'activityAndSeason';
  enabled: boolean;
}

export interface HashtagStudioResult {
  items: HashtagGroupItem[];
  tip: string;
}

