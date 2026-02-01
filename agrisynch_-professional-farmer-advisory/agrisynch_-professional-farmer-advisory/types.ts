
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

// Added missing Region type
export interface Region {
  id: string;
  name: string;
  hindiName: string;
  marathiName: string;
  state: string;
  defaultSoil: SoilType;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

// Added missing SoilProfile type
export interface SoilProfile {
  type: SoilType;
  name: string;
  hindiName: string;
  marathiName: string;
  waterRetention: string;
  drainage: string;
  fertility: string;
  actionTips: string[];
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  usageMode: 'simple' | 'advanced';
  highContrast: boolean;
  hapticFeedback: boolean;
  criticalAlertsOnly: boolean;
  dailyReminderTime: string;
  pinLock: string | null;
  hideSensitiveInfo: boolean;
  // New Personalization & Alerts
  notificationSound: string;
  fontSize: number; // 12-20px range
  weatherAlerts: boolean;
  pestAlerts: boolean;
  marketPriceAlerts: boolean;
  govtSchemesAlerts: boolean;
  twoFactorAuth: boolean;
}

export interface UserProfile {
  name: string;
  phone: string;
  village: string;
  experience: string;
  photoUrl?: string;
  cropPreferences: CropType[];
  irrigationMethod: 'drip' | 'sprinkler' | 'flood' | 'manual';
  advisoryFrequency: 'daily' | 'weekly' | 'urgent';
}

export enum GrowthStage {
  SOWING = 'sowing',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  MATURITY = 'maturity',
  HARVEST = 'harvest'
}

// Added missing CropAdvisory type for CropDataset
export interface CropAdvisory {
  stage: GrowthStage;
  fertilizer: string;
  pestAlert: string;
  irrigation: string;
  tips: string[];
}

// Added missing CropDataset type
export interface CropDataset {
  name: string;
  hindiName: string;
  marathiName: string;
  advisories: Record<GrowthStage, CropAdvisory>;
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

export interface FarmerCrop {
  id: string;
  type: CropType;
  sowingDate: string;
  soilType: SoilType;
  region: string;
  nickname: string;
}
