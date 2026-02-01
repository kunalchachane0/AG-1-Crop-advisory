
import React from 'react';
import { FarmerCrop, Language, GrowthStage } from '../types';
import { TRANSLATIONS, CROP_DATASETS } from '../constants';
import { calculateGrowthStage } from '../services/AdvisoryEngine';

interface CropCardProps {
  crop: FarmerCrop;
  language: Language;
  onClick: (id: string) => void;
}

const CropCard: React.FC<CropCardProps> = ({ crop, language, onClick }) => {
  const t = TRANSLATIONS[language];
  const dataset = CROP_DATASETS[crop.type];
  const stage = calculateGrowthStage(crop.type, crop.sowingDate);

  const getStageColor = (s: GrowthStage) => {
    switch(s) {
      case GrowthStage.SOWING: return 'bg-blue-100 text-blue-700';
      case GrowthStage.VEGETATIVE: return 'bg-green-100 text-green-700';
      case GrowthStage.FLOWERING: return 'bg-yellow-100 text-yellow-700';
      case GrowthStage.MATURITY: return 'bg-orange-100 text-orange-700';
      case GrowthStage.HARVEST: return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div 
      onClick={() => onClick(crop.id)}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 active:bg-slate-50 cursor-pointer transition-all"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg text-slate-800">{crop.nickname || dataset.name}</h3>
          <p className="text-sm text-slate-500">{language === Language.HINDI ? dataset.hindiName : dataset.name}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${getStageColor(stage)}`}>
          {stage}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-slate-50 p-2 rounded-lg">
          <p className="text-[10px] text-slate-400 uppercase font-bold">{t.sowingDate}</p>
          <p className="text-xs font-medium">{new Date(crop.sowingDate).toLocaleDateString()}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg">
          <p className="text-[10px] text-slate-400 uppercase font-bold">{t.soilType}</p>
          <p className="text-xs font-medium uppercase">{crop.soilType}</p>
        </div>
      </div>
    </div>
  );
};

export default CropCard;
