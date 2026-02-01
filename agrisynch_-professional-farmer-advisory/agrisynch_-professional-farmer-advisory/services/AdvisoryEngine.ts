
import { GrowthStage, CropType, AppState, OfflineInsight, InsightPriority, WeatherDay, SoilType } from '../types';
import { CROP_DATASETS, SOIL_PROFILES } from '../constants';

// Determine growth stage based on sowing date
export const calculateGrowthStage = (cropType: CropType, sowingDate: string): GrowthStage => {
  const today = new Date();
  const sowing = new Date(sowingDate);
  const diffDays = Math.floor((today.getTime() - sowing.getTime()) / (1000 * 60 * 60 * 24));

  // Stage thresholds for different crops
  const stages = [
    { type: CropType.RICE, thresholds: [25, 60, 90, 110] },
    { type: CropType.WHEAT, thresholds: [20, 70, 100, 125] },
    { type: CropType.SUGARCANE, thresholds: [30, 150, 240, 330] },
    { type: CropType.COTTON, thresholds: [15, 60, 110, 150] },
    { type: CropType.MAIZE, thresholds: [15, 50, 80, 110] },
    { type: CropType.PULSES, thresholds: [15, 45, 75, 100] },
    { type: CropType.VEGETABLES, thresholds: [10, 40, 70, 90] }
  ];

  const config = stages.find(s => s.type === cropType) || stages[6];
  if (diffDays < config.thresholds[0]) return GrowthStage.SOWING;
  if (diffDays < config.thresholds[1]) return GrowthStage.VEGETATIVE;
  if (diffDays < config.thresholds[2]) return GrowthStage.FLOWERING;
  if (diffDays < config.thresholds[3]) return GrowthStage.MATURITY;
  return GrowthStage.HARVEST;
};

// Local insight generator: Logic based on Weather + Soil + Stage
export const computeForwardInsights = (state: AppState): OfflineInsight[] => {
  const insights: OfflineInsight[] = [];
  const today = state.weatherSnapshot[0];
  const tomorrow = state.weatherSnapshot[1];
  const dayAfter = state.weatherSnapshot[2];

  state.crops.forEach(crop => {
    const stage = calculateGrowthStage(crop.type, crop.sowingDate);
    const soil = SOIL_PROFILES[crop.soilType];
    
    // Waterlogging risk check
    if (tomorrow?.precipChance > 50 || dayAfter?.precipChance > 50) {
      if (soil.drainage.toLowerCase().includes('poor')) {
        insights.push({
          cropId: crop.id,
          cropNickname: crop.nickname || crop.type,
          title: "Critical: Waterlogging Risk",
          description: `Rain coming. Your ${soil.name} has poor drainage. Clear drainage channels now.`,
          priority: InsightPriority.CRITICAL,
          actionDate: 'Today',
          category: 'Weather'
        });
      }
      // Nutrient leaching prevention
      insights.push({
        cropId: crop.id,
        cropNickname: crop.nickname || crop.type,
        title: "Delay Fertilizer",
        description: "Rain expected. Applying fertilizer now will waste nutrients via leaching.",
        priority: InsightPriority.WARNING,
        actionDate: tomorrow?.date || 'Soon',
        category: 'Fertilizer'
      });
    }

    // High temp & irrigation check
    if (stage === GrowthStage.FLOWERING || stage === GrowthStage.VEGETATIVE) {
      const isHot = (today?.temp > 35 || tomorrow?.temp > 35);
      
      if (isHot && soil.waterRetention === 'Low') {
        insights.push({
          cropId: crop.id,
          cropNickname: crop.nickname || crop.type,
          title: "Immediate Irrigation",
          description: `${soil.name} dries fast. Heatwave + low retention requires extra watering today.`,
          priority: InsightPriority.CRITICAL,
          actionDate: 'Today',
          category: 'Soil'
        });
      } else if (isHot) {
        insights.push({
          cropId: crop.id,
          cropNickname: crop.nickname || crop.type,
          title: "Prepare Irrigation",
          description: "High temperature ahead. Plan to water early morning for moisture conservation.",
          priority: InsightPriority.NORMAL,
          actionDate: 'Tomorrow',
          category: 'Weather'
        });
      }
    }

    // Pest risk check
    if (tomorrow?.condition === 'cloudy' || tomorrow?.condition === 'rainy') {
       const pestTitle = crop.type === CropType.COTTON ? "Whitefly Watch" : "Pest Scouting";
       insights.push({
        cropId: crop.id,
        cropNickname: crop.nickname || crop.type,
        title: pestTitle,
        description: "Moist/Cloudy conditions favored by pests. Inspect leaf undersides.",
        priority: InsightPriority.NORMAL,
        actionDate: tomorrow?.date || 'Tomorrow',
        category: 'Pest'
      });
    }

    // Harvest timing logic
    if (stage === GrowthStage.HARVEST && today?.condition === 'sunny') {
      insights.push({
        cropId: crop.id,
        cropNickname: crop.nickname || crop.type,
        title: "Harvest Opportunity",
        description: "Dry weather today is perfect for harvesting and drying grains.",
        priority: InsightPriority.CRITICAL,
        actionDate: 'Today',
        category: 'Weather'
      });
    }
  });

  return insights;
};
