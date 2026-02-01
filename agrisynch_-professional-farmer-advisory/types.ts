
export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  MARATHI = 'mr'
}

export enum CropType {
  RICE = 'rice',
  WHEAT = 'wheat',
  MAIZE = 'maize',
  COTTON = 'cotton',
  SUGARCANE = 'sugarcane',
  PULSES = 'pulses',
  VEGETABLES = 'vegetables'
}

export enum SoilType {
  ALLUVIAL = 'alluvial',
  BLACK = 'black',
  RED = 'red',
  LATRITE = 'latrite',
  SANDY = 'sandy'
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Region {
  id: string;
  name: string;
  hindiName: string;
  marathiName: string;
  state: string;
  defaultSoil: SoilType;
  bounds: GeoBounds;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  usageMode: 'simple' | 'advanced';
  highContrast: boolean;
  hapticFeedback: boolean;
  criticalAlertsOnly: boolean;
  dailyReminderTime: string;
  pinLock: string | null;
  hideSensitiveInfo: boolean;
}

export interface UserProfile {
  name: string;
  phone: string;
  village: string;
  experience: string;
}

export interface SoilProfile {
  type: SoilType;
  name: string;
  hindiName: string;
  marathiName: string;
  waterRetention: 'Low' | 'Medium' | 'High';
  drainage: string;
  fertility: string;
  actionTips: string[];
}

export enum GrowthStage {
  SOWING = 'sowing',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  MATURITY = 'maturity',
  HARVEST = 'harvest'
}

export enum InsightPriority {
  CRITICAL = 'critical',
  WARNING = 'warning',
  NORMAL = 'normal'
}

export interface WeatherDay {
  date: string;
  temp: number;
  condition: 'sunny' | 'rainy' | 'cloudy' | 'storm';
  precipChance: number;
}

export interface OfflineInsight {
  cropId: string;
  cropNickname: string;
  title: string;
  description: string;
  priority: InsightPriority;
  actionDate: string;
  category: 'Weather' | 'Soil' | 'Pest' | 'Fertilizer';
}

export interface DiagnosticCase {
  id: string;
  timestamp: string;
  cropNickname: string;
  description: string;
  diagnosis: string;
  imageUrl?: string;
}

export interface AdvisoryRule {
  stage: GrowthStage;
  fertilizer: string;
  pestAlert: string;
  irrigation: string;
  tips: string[];
}

export interface CropDataset {
  name: string;
  hindiName: string;
  marathiName: string;
  advisories: Record<GrowthStage, AdvisoryRule>;
}

export interface FarmerCrop {
  id: string;
  type: CropType;
  sowingDate: string;
  soilType: SoilType;
  region: string;
  nickname: string;
}

export interface AppState {
  language: Language;
  user: UserProfile | null;
  crops: FarmerCrop[];
  weatherSnapshot: WeatherDay[];
  isOnline: boolean;
  lastSyncTime: string | null;
  cachedInsights: OfflineInsight[];
  diagnosticHistory: DiagnosticCase[];
  settings: UserSettings;
}
