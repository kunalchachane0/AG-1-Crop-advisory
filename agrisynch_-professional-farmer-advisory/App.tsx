
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Language, AppState, FarmerCrop, CropType, SoilType, 
  GrowthStage, InsightPriority, WeatherDay, UserProfile, SoilProfile, OfflineInsight,
  DiagnosticCase
} from './types';
import { TRANSLATIONS, CROP_DATASETS, SOIL_PROFILES } from './constants';
import { calculateGrowthStage, computeForwardInsights } from './services/AdvisoryEngine';
import { getDiagnosticAdvice, transcribeAudio, generateSpeech, processCommandIntent } from './services/geminiService';

const IMAGES = {
  onboarding: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
  homeHero: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80',
  emptyState: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1200&q=80',
  analytics: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1200&q=80',
  diagnostics: 'https://images.unsplash.com/photo-1589923188900-85dae523342a?w=1200&q=80',
  library: 'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?w=1200&q=80'
};

const CROP_ICONS: Record<CropType, string> = {
  [CropType.RICE]: '🌾', [CropType.WHEAT]: '🍞', [CropType.MAIZE]: '🌽', 
  [CropType.COTTON]: '☁️', [CropType.SUGARCANE]: '🎋', [CropType.PULSES]: '🫘', 
  [CropType.VEGETABLES]: '🥦'
};

const Logo = ({ size = "md", light = false }: { size?: "sm" | "md" | "lg", light?: boolean }) => {
  const dimensions = { sm: "w-10 h-10", md: "w-20 h-20", lg: "w-32 h-32" }[size];
  return (
    <div className={`${dimensions} flex items-center justify-center ${light ? 'bg-white' : 'bg-emerald-950'} rounded-3xl shadow-2xl border-b-4 border-emerald-900/20 overflow-hidden transition-transform duration-300 hover:rotate-3`}>
      <svg viewBox="0 0 100 100" className="w-full h-full p-2">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#064e3b', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path d="M50,15 A35,35 0 0,1 85,50 A35,35 0 0,1 50,85 L50,65 A15,15 0 0,0 65,50 A15,15 0 0,0 50,35 Z" fill="url(#logoGrad)" />
        <path d="M50,15 A35,35 0 0,0 15,50 A35,35 0 0,0 50,85 L50,65 A15,15 0 0,1 35,50 A15,15 0 0,1 50,35 Z" fill={light ? "#064e3b" : "#10b981"} opacity="0.3" />
        <circle cx="50" cy="50" r="10" fill="url(#logoGrad)" />
      </svg>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'crops' | 'library' | 'diagnostics' | 'settings' | 'onboarding' | 'add' | 'detail' | 'privacy' | 'caseLog'>('home');
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);
  const [diagText, setDiagText] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  
  // Voice Assistant specific state
  const [isAssistantActive, setIsAssistantActive] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [assistantText, setAssistantText] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('agrisynch_store_v12');
    if (saved) return JSON.parse(saved);
    return {
      language: Language.ENGLISH,
      user: null,
      crops: [],
      weatherSnapshot: [],
      isOnline: navigator.onLine,
      lastSyncTime: null,
      cachedInsights: [],
      diagnosticHistory: [],
      settings: {
        theme: 'light', usageMode: 'simple', highContrast: false,
        hapticFeedback: true, criticalAlertsOnly: false, dailyReminderTime: '08:00',
        pinLock: null, hideSensitiveInfo: false
      }
    };
  });

  const isDarkMode = state.settings.theme === 'dark';
  const t = TRANSLATIONS[state.language];

  useEffect(() => { if (!state.settings.pinLock) setIsAppLocked(false); }, [state.settings.pinLock]);

  useEffect(() => {
    const onOnline = () => setState(p => ({ ...p, isOnline: true }));
    const onOffline = () => setState(p => ({ ...p, isOnline: false }));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => { localStorage.setItem('agrisynch_store_v12', JSON.stringify(state)); }, [state]);

  const handleSync = useCallback(() => {
    const today = new Date();
    const weather: WeatherDay[] = [0, 1, 2, 3].map(i => ({
      date: new Date(today.getTime() + i * 86400000).toLocaleDateString(),
      temp: 28 + Math.floor(Math.random() * 8),
      condition: (['sunny', 'cloudy', 'rainy', 'storm'] as const)[Math.floor(Math.random() * 4)],
      precipChance: Math.floor(Math.random() * 100)
    }));
    setState(p => ({ 
      ...p, 
      weatherSnapshot: weather, 
      lastSyncTime: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
      isOnline: navigator.onLine
    }));
  }, []);

  useEffect(() => { if (!state.lastSyncTime) handleSync(); }, [handleSync]);

  const insights = useMemo(() => computeForwardInsights(state), [state]);

  const toggleTheme = useCallback(() => {
    setState(p => ({
      ...p,
      settings: {
        ...p.settings,
        theme: p.settings.theme === 'light' ? 'dark' : 'light'
      }
    }));
  }, []);

  const selectedCrop = useMemo(() => 
    state.crops.find(c => c.id === selectedCropId), 
    [state.crops, selectedCropId]
  );

  const startListening = async (target: 'diagnostics' | 'assistant') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/pcm;rate=16000' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          if (target === 'diagnostics') {
            setIsThinking(true);
            const transcript = await transcribeAudio(base64);
            if (transcript) setDiagText(p => p + " " + transcript);
            setIsThinking(false);
          } else {
            setAssistantStatus('thinking');
            const transcript = await transcribeAudio(base64);
            if (transcript) {
              setAssistantText(transcript);
              const result = await processCommandIntent(transcript);
              handleAssistantAction(result);
            } else {
              setAssistantStatus('idle');
            }
          }
        };
      };
      recorder.start();
      if (target === 'diagnostics') setIsRecording(true);
      else setAssistantStatus('listening');
    } catch (e) { console.error("Mic Error", e); }
  };

  const stopListening = (target: 'diagnostics' | 'assistant') => {
    recorderRef.current?.stop();
    if (target === 'diagnostics') setIsRecording(false);
  };

  const handleAssistantAction = async (result: any) => {
    if (result.action === 'NAVIGATE') {
      setView(result.target);
      speakResult(result.message || `Navigating to ${result.target}`, true);
    } else if (result.action === 'SPEAK') {
      speakResult(result.message, true);
    } else {
      speakResult("I understood your command but don't know how to execute that yet.", true);
    }
  };

  const speakResult = async (text: string, isAssistant = false) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    if (isAssistant) setAssistantStatus('speaking');
    
    const audio64 = await generateSpeech(text);
    if (audio64) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binary = atob(audio64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(audioCtx.destination);
      src.onended = () => {
        setIsSpeaking(false);
        if (isAssistant) {
          setAssistantStatus('idle');
          setTimeout(() => setIsAssistantActive(false), 2000);
        }
      };
      src.start();
    } else { 
      setIsSpeaking(false); 
      if (isAssistant) setAssistantStatus('idle');
    }
  };

  const saveDiagnostic = (nickname: string, description: string, result: string, image?: string) => {
    const newCase: DiagnosticCase = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      cropNickname: nickname,
      description,
      diagnosis: result,
      imageUrl: image
    };
    setState(p => ({ ...p, diagnosticHistory: [newCase, ...p.diagnosticHistory] }));
  };

  const themeClasses = isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClasses = isDarkMode ? 'bg-slate-800 border-slate-700 shadow-emerald-950/20' : 'bg-white border-slate-100 shadow-xl';
  const textClasses = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const subTextClasses = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  if (isAppLocked && state.settings.pinLock) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-8 text-white font-['Inter']">
        <Logo size="lg" light />
        <h2 className="text-2xl font-black mt-8 tracking-tighter uppercase">Secure Entry</h2>
        <div className="flex gap-4 mt-12 mb-12">
           {[...Array(4)].map((_, i) => (
             <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinEntry.length > i ? 'bg-emerald-400 border-emerald-400 scale-125' : 'border-white/20'}`}></div>
           ))}
        </div>
        <div className="grid grid-cols-3 gap-6 max-w-[280px]">
           {[1,2,3,4,5,6,7,8,9, 'C', 0, '⌫'].map(k => (
             <button key={k} onClick={() => {
                if (k === 'C') setPinEntry('');
                else if (k === '⌫') setPinEntry(p => p.slice(0, -1));
                else if (pinEntry.length < 4) {
                  const next = pinEntry + k;
                  setPinEntry(next);
                  if (next === state.settings.pinLock) setIsAppLocked(false);
                }
             }} className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black bg-white/10 border border-white/20 active:scale-90 transition-all">{k}</button>
           ))}
        </div>
      </div>
    );
  }

  if (!state.user) {
    return (
      <div className="min-h-screen relative bg-emerald-950 flex flex-col items-center justify-end p-8 text-white">
        <img src={IMAGES.onboarding} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Background" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent"></div>
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center space-y-10 animate-in fade-in duration-1000">
           <Logo size="lg" light />
           <div className="text-center">
             <h1 className="text-5xl font-black tracking-tighter mb-2">AgriSynch</h1>
             <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Professional Rural Intelligence</p>
           </div>
           <form onSubmit={(e) => {
             e.preventDefault();
             const f = new FormData(e.currentTarget);
             setState(p => ({ ...p, user: { name: f.get('name') as string, village: f.get('village') as string, phone: '', experience: 'Expert' } }));
           }} className="w-full space-y-4">
              <input name="name" required placeholder="Farmer's Full Name" className="w-full p-6 bg-white/10 border border-white/20 rounded-[2rem] font-bold text-lg outline-none backdrop-blur-xl focus:border-emerald-400 transition-all" />
              <input name="village" required placeholder="Village Name / District" className="w-full p-6 bg-white/10 border border-white/20 rounded-[2rem] font-bold text-lg outline-none backdrop-blur-xl focus:border-emerald-400 transition-all" />
              <button type="submit" className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-3xl hover:bg-emerald-400 active:scale-95 transition-all">Initialize System</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen max-w-md mx-auto flex flex-col shadow-3xl overflow-hidden font-['Inter'] selection:bg-emerald-100 transition-colors duration-300 ${themeClasses}`}>
      
      <header className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} px-6 py-5 flex justify-between items-center sticky top-0 z-[100] border-b pt-safe shadow-sm transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <div onClick={() => setView('home')} className="cursor-pointer active:scale-95 hover:scale-105 transition-all">
            <Logo size="sm" />
          </div>
          <div>
            <h1 className={`text-lg font-black tracking-tighter ${textClasses} leading-none`}>AgriSynch</h1>
            <div className="flex items-center gap-1.5 mt-2">
               <span className={`w-2 h-2 rounded-full ${state.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
               <span className={`text-[9px] font-black uppercase tracking-widest ${state.isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {state.isOnline ? 'Sync Active' : 'Offline Mode'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setView('caseLog')} className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'} w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-105 transition-all`}>
             <span className="text-xl">📋</span>
           </button>
           <button onClick={handleSync} className={`${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-500'} w-12 h-12 border rounded-2xl flex items-center justify-center active:scale-95 transition-all`}>
             <svg className={`w-6 h-6 ${state.isOnline ? 'animate-spin-slow' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-40 relative">
        <div className={`absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full blur-3xl pointer-events-none ${isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-500/5'}`}></div>

        {view === 'home' && (
          <div className="p-6 space-y-8 animate-in fade-in duration-700">
            {/* Weather Center */}
            <section className={`${cardClasses} p-8 rounded-[3rem] overflow-hidden relative group`}>
               <div className="flex justify-between items-start relative z-10">
                  <div>
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Local Conditions</p>
                     <h2 className="text-4xl font-black tracking-tight">{state.weatherSnapshot[0]?.temp}°C</h2>
                     <p className={`text-sm font-bold ${subTextClasses} capitalize mt-1`}>{state.weatherSnapshot[0]?.condition} Sky</p>
                  </div>
                  <div className="text-6xl animate-bounce-slow">
                     {state.weatherSnapshot[0]?.condition === 'sunny' ? '☀️' : state.weatherSnapshot[0]?.condition === 'rainy' ? '🌧️' : '☁️'}
                  </div>
               </div>
               <div className="grid grid-cols-4 gap-4 mt-10 relative z-10">
                  {state.weatherSnapshot.map((w, i) => (
                    <div key={i} className="text-center">
                       <p className="text-[8px] font-black uppercase text-slate-400 mb-2">{i === 0 ? 'Today' : w.date.split('/')[0] + '/' + w.date.split('/')[1]}</p>
                       <span className="text-2xl block mb-2">{w.condition === 'sunny' ? '☀️' : w.condition === 'rainy' ? '🌧️' : '☁️'}</span>
                       <p className={`text-[10px] font-black ${textClasses}`}>{w.temp}°</p>
                    </div>
                  ))}
               </div>
            </section>

            {/* Welcome & Stats */}
            <div className="flex items-end justify-between px-2">
               <div>
                  <h2 className={`text-3xl font-black ${textClasses} tracking-tighter`}>Hello, {state.user?.name.split(' ')[0]}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Village: {state.user?.village}</p>
               </div>
            </div>

            {/* Smart Feed */}
            <section className="space-y-4">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Intel</h3>
               </div>
               {insights.length === 0 ? (
                 <div className={`${cardClasses} p-12 rounded-[3rem] text-center border-2 border-dashed`}>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Register plots for advice.</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                    {insights.slice(0, 3).map((ins, i) => (
                      <div key={i} className={`${cardClasses} p-6 rounded-[2.5rem] flex gap-5 group cursor-pointer`}>
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${ins.priority === InsightPriority.CRITICAL ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                           {ins.category === 'Weather' ? '🌪️' : ins.category === 'Pest' ? '🦗' : '🌱'}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{ins.cropNickname} • {ins.category}</p>
                            <h4 className={`font-black ${textClasses} text-sm truncate`}>{ins.title}</h4>
                            <p className={`text-[10px] ${subTextClasses} font-bold mt-1 line-clamp-2`}>{ins.description}</p>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </section>
          </div>
        )}

        {view === 'caseLog' && (
           <div className="p-6 space-y-10 animate-in slide-in-from-right duration-500">
              <div className="flex items-center gap-5">
                 <button onClick={() => setView('home')} className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center`}>←</button>
                 <h2 className={`text-4xl font-black ${textClasses} tracking-tighter`}>History</h2>
              </div>
              <div className="space-y-6">
                 {state.diagnosticHistory.map((c) => (
                   <div key={c.id} className={`${cardClasses} p-8 rounded-[3rem] space-y-6`}>
                      <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-6">
                         <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{c.timestamp}</p>
                            <h3 className={`text-2xl font-black ${textClasses} tracking-tight`}>{c.cropNickname}</h3>
                         </div>
                         {c.imageUrl && <img src={c.imageUrl} className="w-16 h-16 rounded-2xl object-cover" alt="Symptom" />}
                      </div>
                      <button onClick={() => speakResult(c.diagnosis)} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-emerald-600`}>
                         Read Aloud 🔊
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {view === 'library' && (
           <div className="p-6 space-y-10 animate-in fade-in duration-500">
              <h2 className={`text-4xl font-black ${textClasses} tracking-tighter`}>Library</h2>
              <div className="grid grid-cols-2 gap-4">
                 <div className={`${cardClasses} p-6 rounded-[2.5rem]`}>
                    <span className="text-4xl block mb-6">🌿</span>
                    <h3 className={`text-lg font-black ${textClasses} tracking-tight uppercase`}>Crop Guide</h3>
                 </div>
                 <div className={`${cardClasses} p-6 rounded-[2.5rem]`}>
                    <span className="text-4xl block mb-6">🪨</span>
                    <h3 className={`text-lg font-black ${textClasses} tracking-tight uppercase`}>Soil Types</h3>
                 </div>
              </div>
           </div>
        )}

        {view === 'diagnostics' && (
           <div className="p-6 space-y-10 animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center gap-5">
                 <button onClick={() => setView('home')} className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center`}>←</button>
                 <h2 className={`text-4xl font-black ${textClasses} tracking-tighter`}>Expert</h2>
              </div>
              
              <div className={`${cardClasses} p-10 rounded-[4rem] space-y-10`}>
                 <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-[2.5rem] relative">
                    <button 
                      onMouseDown={() => startListening('diagnostics')} 
                      onMouseUp={() => stopListening('diagnostics')} 
                      className="w-full py-8 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
                    >
                      {isRecording ? 'Listening...' : 'Hold to Record Symptom'}
                    </button>
                 </div>
                 <textarea 
                    value={diagText} onChange={(e) => setDiagText(e.target.value)}
                    placeholder="Describe leaf spots..."
                    className={`w-full p-8 ${isDarkMode ? 'bg-slate-700 text-slate-100' : 'bg-slate-50 text-slate-800'} border-2 rounded-[3rem] font-bold text-lg min-h-[160px]`}
                 />
                 <button 
                   onClick={async () => {
                     setIsThinking(true);
                     const res = await getDiagnosticAdvice("Crop", "Active", diagText, diagImage?.split(',')[1]);
                     setDiagResult(res); 
                     setIsThinking(false);
                     if (res) saveDiagnostic("Expert Consult", diagText, res, diagImage || undefined);
                   }}
                   className="w-full py-8 bg-emerald-600 text-white rounded-[3rem] font-black uppercase"
                 >
                   {isThinking ? 'Thinking...' : 'Consult AI Expert'}
                 </button>
              </div>
              {diagResult && (
                 <div className={`${cardClasses} p-12 rounded-[4rem] relative`}>
                    <div className={`prose prose-sm font-bold text-[13px] leading-relaxed whitespace-pre-wrap ${textClasses}`}>
                       {diagResult}
                    </div>
                 </div>
              )}
           </div>
        )}

        {view === 'crops' && (
           <div className="p-6 space-y-10">
              <div className="flex justify-between items-end">
                 <h2 className={`text-4xl font-black ${textClasses} tracking-tighter leading-none`}>Lands</h2>
                 <button onClick={() => setView('add')} className="w-16 h-16 bg-emerald-600 text-white rounded-[2rem] shadow-3xl flex items-center justify-center text-4xl">+</button>
              </div>
              <div className="grid gap-8">
                 {state.crops.map((c, i) => (
                   <div key={c.id} onClick={() => { setSelectedCropId(c.id); setView('detail'); }} className={`${cardClasses} rounded-[3rem] p-10 flex gap-6 items-center`}>
                      <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center text-5xl shrink-0">{CROP_ICONS[c.type]}</div>
                      <div>
                         <h3 className={`text-2xl font-black ${textClasses}`}>{c.nickname}</h3>
                         <p className={`text-xs font-bold ${subTextClasses}`}>{c.type}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {view === 'settings' && (
          <div className="p-6 space-y-10">
             <h2 className={`text-4xl font-black ${textClasses} tracking-tighter`}>{t.settings}</h2>
             <div className={`${cardClasses} p-8 rounded-[3rem] space-y-8`}>
                <div className="flex justify-between items-center">
                   <p className={`font-black ${textClasses}`}>{t.theme}</p>
                   <button onClick={toggleTheme} className={`w-14 h-8 rounded-full transition-colors relative ${isDarkMode ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
                   </button>
                </div>
                <button onClick={() => setView('privacy')} className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-700">
                   <p className={`font-black ${textClasses}`}>PIN & Data Privacy</p>
                   <span className="text-emerald-500 text-xl">🛡️</span>
                </button>
             </div>
          </div>
        )}

        {view === 'add' && (
           <div className="p-6 space-y-10">
              <h2 className={`text-4xl font-black ${textClasses} tracking-tighter`}>New Plot</h2>
              <form onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const newCrop: FarmerCrop = {
                    id: Date.now().toString(),
                    nickname: f.get('nickname') as string,
                    type: f.get('type') as CropType,
                    sowingDate: f.get('sowingDate') as string,
                    soilType: f.get('soilType') as SoilType,
                    region: 'Default'
                  };
                  setState(p => ({ ...p, crops: [...p.crops, newCrop] }));
                  setView('crops');
                }} className={`${cardClasses} p-10 rounded-[4rem] space-y-10`}>
                 <input name="nickname" required placeholder="Field Name" className="w-full p-8 border-2 rounded-[2.5rem] font-bold text-lg" />
                 <select name="type" className="w-full p-6 border-2 rounded-[2rem] font-bold">
                    {Object.values(CropType).map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                 </select>
                 <select name="soilType" className="w-full p-6 border-2 rounded-[2rem] font-bold">
                    {Object.values(SoilType).map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                 </select>
                 <input name="sowingDate" type="date" required className="w-full p-8 border-2 rounded-[2.5rem] font-bold" />
                 <button type="submit" className="w-full py-8 bg-emerald-600 text-white rounded-[2.5rem] font-black uppercase">Register</button>
              </form>
           </div>
        )}

        {view === 'detail' && selectedCrop && (
           <div className="p-6 space-y-10">
              <h2 className={`text-3xl font-black ${textClasses}`}>{selectedCrop.nickname}</h2>
              <div className="bg-emerald-950 text-white rounded-[4rem] p-12">
                 <span className="text-8xl block mb-6">{CROP_ICONS[selectedCrop.type]}</span>
                 <p className="text-emerald-400 font-bold uppercase tracking-[0.4em] text-[10px]">{selectedCrop.type}</p>
              </div>
           </div>
        )}

        {view === 'privacy' && (
          <div className="p-6 space-y-10">
             <h2 className={`text-4xl font-black ${textClasses}`}>Security</h2>
             <div className={`${cardClasses} p-8 rounded-[3rem] space-y-8`}>
                <button onClick={() => {
                  const p = prompt("Set 4-digit PIN:");
                  if (p && /^\d{4}$/.test(p)) setState(state => ({ ...state, settings: { ...state.settings, pinLock: p } }));
                }} className={`w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 font-black text-emerald-600 uppercase`}>
                   Set PIN Lock
                </button>
             </div>
          </div>
        )}
      </main>

      {/* Global Voice Assistant Floating Button */}
      <div className="fixed bottom-32 right-6 z-[300]">
        <button 
          onMouseDown={() => {
            setIsAssistantActive(true);
            setAssistantText('');
            startListening('assistant');
          }}
          onMouseUp={() => stopListening('assistant')}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-3xl transition-all duration-300 transform active:scale-90 ${assistantStatus === 'listening' ? 'bg-rose-500 animate-pulse scale-110' : 'bg-emerald-600 hover:bg-emerald-500'}`}
        >
          {assistantStatus === 'listening' ? '🔊' : assistantStatus === 'thinking' ? '⏳' : '🎙️'}
        </button>
      </div>

      {/* Assistant Overlay UI */}
      {isAssistantActive && (
        <div className="fixed inset-0 z-[400] bg-emerald-950/90 backdrop-blur-xl p-8 flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="mb-12">
              <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${assistantStatus === 'listening' ? 'border-rose-400 scale-125 animate-pulse' : assistantStatus === 'thinking' ? 'border-emerald-400 rotate-180 scale-100' : 'border-white scale-100'}`}>
                 <span className="text-6xl">{assistantStatus === 'listening' ? '👂' : assistantStatus === 'thinking' ? '🧠' : '💬'}</span>
              </div>
           </div>
           
           <div className="text-center max-w-sm space-y-6">
              <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px]">AgriSynch Assistant</p>
              <h3 className="text-white text-3xl font-black tracking-tight leading-tight">
                {assistantStatus === 'listening' ? "I'm listening..." : assistantStatus === 'thinking' ? "Processing your request..." : assistantStatus === 'speaking' ? "Responding..." : "Ready"}
              </h3>
              <p className="text-white/60 font-bold italic text-lg line-clamp-3">
                {assistantText || (assistantStatus === 'listening' ? "Try: 'Show my crops' or 'How is the weather?'" : "")}
              </p>
           </div>
           
           <button 
             onClick={() => setIsAssistantActive(false)}
             className="mt-20 px-10 py-4 bg-white/10 border border-white/20 rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white/20"
           >
             Close Assistant
           </button>
        </div>
      )}

      <nav className={`${isDarkMode ? 'bg-slate-800/95 border-slate-700 shadow-emerald-950/40' : 'bg-white/95 border-slate-100 shadow-3xl'} fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-3xl border-t grid grid-cols-5 pt-4 pb-10 px-4 z-[200] h-[110px] transition-colors duration-300`}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'crops', icon: '🌾', label: 'Lands' },
          { id: 'diagnostics', icon: '🧪', label: 'Expert' },
          { id: 'library', icon: '📖', label: 'Library' },
          { id: 'settings', icon: '⚙️', label: 'Menu' },
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id as any)} 
            className={`flex flex-col items-center gap-2 transition-all duration-300 active:scale-90 hover:scale-110 ${view === item.id || (view === 'caseLog' && item.id === 'home') || (view === 'privacy' && item.id === 'settings') ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-700') : (isDarkMode ? 'text-slate-500 opacity-60' : 'text-slate-300 opacity-60 grayscale')}`}
          >
            <span className="text-3xl">{item.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
