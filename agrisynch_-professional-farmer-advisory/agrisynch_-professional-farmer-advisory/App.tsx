
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Language, AppState, FarmerCrop, CropType, SoilType, 
  GrowthStage, InsightPriority, WeatherDay, UserProfile, SoilProfile, OfflineInsight,
  DiagnosticCase
} from './types';
import { TRANSLATIONS, CROP_DATASETS, SOIL_PROFILES, REGIONS } from './constants';
import { calculateGrowthStage, computeForwardInsights } from './services/AdvisoryEngine';
import { getDiagnosticAdvice, transcribeAudio, generateSpeech, processCommandIntent } from './services/geminiService';

const IMAGES = {
  onboarding: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
  homeHero: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  pestControl: 'https://images.unsplash.com/photo-1592919016327-5050f721eaac?w=600&q=80',
  soilCare: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&q=80',
  schemes: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?w=600&q=80'
};

const CROP_ICONS: Record<CropType, string> = {
  [CropType.RICE]: '🌾', [CropType.WHEAT]: '🍞', [CropType.MAIZE]: '🌽', 
  [CropType.COTTON]: '☁️', [CropType.SUGARCANE]: '🎋', [CropType.PULSES]: '🫘', 
  [CropType.VEGETABLES]: '🥦'
};

const Logo = ({ size = "md", light = false }: { size?: "sm" | "md" | "lg", light?: boolean }) => {
  const dimensions = { 
    sm: "h-8", 
    md: "h-16", 
    lg: "h-24" 
  }[size];
  
  const textColor = light ? '#ffffff' : '#166534';
  const leafColorPrimary = '#166534';
  const leafColorSecondary = '#22c55e';
  const grainColor = '#facc15';

  return (
    <div className={`${dimensions} flex items-center transition-all duration-500`}>
      <svg viewBox="0 0 240 100" className="h-full w-auto drop-shadow-sm">
        <defs>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: leafColorSecondary, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: leafColorPrimary, stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path 
          d="M45,85 C15,85 15,45 35,25 C45,15 65,15 75,35 C85,55 85,85 55,85 Z" 
          fill="url(#leafGrad)" 
        />
        <g transform="translate(42, 35) rotate(-15)">
          <path d="M0,0 L0,40" stroke={grainColor} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="-6" cy="10" rx="5" ry="3" fill={grainColor} transform="rotate(-30 -6 10)" />
          <ellipse cx="6" cy="15" rx="5" ry="3" fill={grainColor} transform="rotate(30 6 15)" />
          <ellipse cx="-6" cy="22" rx="5" ry="3" fill={grainColor} transform="rotate(-30 -6 22)" />
          <ellipse cx="6" cy="27" rx="5" ry="3" fill={grainColor} transform="rotate(30 6 27)" />
          <ellipse cx="-6" cy="34" rx="5" ry="3" fill={grainColor} transform="rotate(-30 -6 34)" />
          <ellipse cx="6" cy="39" rx="5" ry="3" fill={grainColor} transform="rotate(30 6 39)" />
        </g>
        <text 
          x="90" 
          y="75" 
          fontFamily="Arial, sans-serif" 
          fontSize="65" 
          fontWeight="900" 
          fill={textColor}
          letterSpacing="-2"
        >
          gri
        </text>
        <circle cx="212" cy="38" r="8" fill={textColor} />
      </svg>
    </div>
  );
};

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1000] bg-[#022c22] flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-500">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      </div>
      
      <div className="relative flex flex-col items-center space-y-8 animate-in zoom-in-75 slide-in-from-bottom-12 duration-1000 ease-out-expo">
        <Logo size="lg" light />
        
        <div className="flex flex-col items-center space-y-2 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-forwards">
          <p className="text-emerald-400 font-black uppercase tracking-[0.4em] text-[10px]">Rural Intelligence</p>
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-4 relative">
            <div className="absolute top-0 left-0 h-full bg-emerald-500 shimmer" style={{ width: '100%', animation: 'shimmer 2.5s infinite linear' }}></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 text-white/30 text-[9px] font-black uppercase tracking-widest animate-in fade-in duration-1000 delay-1000">
        Secure Offline Ecosystem • v1.4
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'crops' | 'library' | 'diagnostics' | 'settings' | 'onboarding' | 'auth-landing' | 'login' | 'signup' | 'add' | 'detail' | 'caseLog'>('onboarding');
  const [isSplashing, setIsSplashing] = useState(true);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);
  const [diagText, setDiagText] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [assistantStatus, setAssistantStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('agrisynch_store_v14');
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
        pinLock: null, hideSensitiveInfo: false,
        notificationSound: 'Bell', fontSize: 14,
        weatherAlerts: true, pestAlerts: true,
        marketPriceAlerts: false, govtSchemesAlerts: true,
        twoFactorAuth: false
      }
    } as AppState;
  });

  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => {
      setIsSplashing(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (state.user && view === 'onboarding') setView('home');
  }, [state.user, view]);

  const handleGoogleSignIn = () => {
    setAuthLoading(true);
    setTimeout(() => {
      setState(p => ({
        ...p,
        user: {
          name: "Rajesh Kumar",
          village: "Narayangaon",
          phone: "+91 98765 43210",
          experience: "Expert",
          cropPreferences: [CropType.WHEAT, CropType.COTTON],
          irrigationMethod: 'drip',
          advisoryFrequency: 'daily',
          photoUrl: IMAGES.avatar
        }
      }));
      setAuthLoading(false);
      setView('home');
    }, 2000);
  };

  const handleAuthSubmit = (e: React.FormEvent<HTMLFormElement>, mode: 'login' | 'signup') => {
    e.preventDefault();
    setAuthLoading(true);
    const f = new FormData(e.currentTarget);
    setTimeout(() => {
      setState(p => ({ 
        ...p, 
        user: { 
          name: (f.get('name') as string) || "Farmer User", 
          village: (f.get('village') as string) || "Regional District", 
          phone: (f.get('phone') as string) || "", 
          experience: 'Intermediate',
          cropPreferences: [],
          irrigationMethod: 'manual',
          advisoryFrequency: 'daily'
        } 
      }));
      setAuthLoading(false);
      setView('home');
    }, 1500);
  };

  const startListening = async (context: string) => {
    setIsRecording(true);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Content = (reader.result as string).split(',')[1];
          setAssistantStatus('thinking');
          const transcription = await transcribeAudio(base64Content);
          setAssistantStatus('idle');
          if (transcription && context === 'diagnostics') {
            setDiagText(prev => prev + (prev ? ' ' : '') + transcription);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setAssistantStatus('listening');
    } catch (err) {
      console.error("Microphone access error:", err);
      setIsRecording(false);
    }
  };

  const stopListening = (context: string) => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    setAssistantStatus('idle');
  };

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
  const isDarkMode = state.settings.theme === 'dark';
  const t = TRANSLATIONS[state.language];

  const runDiagnostic = async () => {
    if (!diagText && !diagImage) return;
    setIsThinking(true);
    setDiagResult(null);
    const crop = state.crops.find(c => c.id === selectedCropId) || state.crops[0];
    const stage = crop ? calculateGrowthStage(crop.type, crop.sowingDate) : 'Unknown';
    const result = await getDiagnosticAdvice(crop?.type || 'General Crop', stage, diagText || "Visual inspection requested.", diagImage || undefined);
    setDiagResult(result);
    setIsThinking(false);
    const newCase: DiagnosticCase = { id: Date.now().toString(), timestamp: new Date().toLocaleString(), cropNickname: crop?.nickname || 'Field Query', description: diagText, diagnosis: result, imageUrl: diagImage || undefined };
    setState(p => ({ ...p, diagnosticHistory: [newCase, ...p.diagnosticHistory].slice(0, 20) }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDiagImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const themeClasses = isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClasses = isDarkMode ? 'bg-slate-800 border-slate-700 shadow-emerald-950/20' : 'bg-white border-slate-100 shadow-xl';
  const textClasses = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const subTextClasses = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const NavItem = ({ id, icon, label }: { id: string, icon: string, label: string }) => {
    const isActive = view === id;
    return (
      <button onClick={() => setView(id as any)} className={`flex flex-col items-center gap-2 transition-all duration-300 relative group ${isActive ? 'text-emerald-500 scale-110' : 'text-slate-400 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}>
        <span className="text-3xl transition-transform duration-300 group-hover:-translate-y-1">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
        {isActive && <div className="absolute -bottom-1 w-10 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-in zoom-in duration-300"></div>}
      </button>
    );
  };

  const selectedCrop = useMemo(() => state.crops.find(c => c.id === selectedCropId), [selectedCropId, state.crops]);

  if (isSplashing) {
    return <SplashScreen />;
  }

  if (!state.user) {
    if (view === 'onboarding') {
      return (
        <div className="h-screen relative bg-emerald-950 flex flex-col items-center justify-end p-8 text-white animate-in fade-in duration-700">
          <img src={IMAGES.onboarding} className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-[10s] hover:scale-110" alt="Background" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent"></div>
          <div className="relative z-10 w-full max-w-sm flex flex-col items-center space-y-12">
             <Logo size="lg" light />
             <div className="text-center">
               <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Professional Rural Intelligence</p>
             </div>
             <button onClick={() => setView('auth-landing')} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-3xl hover:bg-emerald-400 active:scale-95 transition-all duration-300">Get Started</button>
          </div>
        </div>
      );
    }

    if (view === 'auth-landing') {
      return (
        <div className="h-screen bg-emerald-950 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden animate-view-entry">
          <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
            <Logo size="md" light />
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tighter">Welcome</h2>
              <p className="text-slate-400 font-bold text-sm">Synchronize your farm across all devices.</p>
            </div>

            <div className="space-y-4">
              <button onClick={handleGoogleSignIn} disabled={authLoading} className="w-full py-5 bg-white text-emerald-950 rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all duration-300 relative group overflow-hidden">
                {authLoading && <div className="absolute inset-0 shimmer opacity-30"></div>}
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </button>
              <div className="flex items-center gap-4 py-2 opacity-30"><div className="flex-1 h-[1px] bg-white"></div><span className="text-[10px] font-black uppercase tracking-widest">or</span><div className="flex-1 h-[1px] bg-white"></div></div>
              <button onClick={() => setView('signup')} className="w-full py-5 bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 rounded-[2rem] font-black uppercase tracking-widest text-xs active:scale-95 transition-all">Create Account</button>
              <button onClick={() => setView('login')} className="w-full py-5 text-slate-400 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:text-white transition-all">Log In</button>
            </div>
          </div>
        </div>
      );
    }

    if (view === 'signup' || view === 'login') {
      const isLogin = view === 'login';
      return (
        <div className="h-screen bg-emerald-950 flex flex-col p-8 text-white animate-view-entry">
          <button onClick={() => setView('auth-landing')} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl mb-12 self-start">←</button>
          <div className="flex-1 w-full max-w-sm mx-auto space-y-10">
            <h2 className="text-4xl font-black tracking-tighter">{isLogin ? 'Welcome Back' : 'New Journey'}</h2>
            <form onSubmit={(e) => handleAuthSubmit(e, isLogin ? 'login' : 'signup')} className="space-y-4">
              {!isLogin && (
                <>
                  <input name="name" required placeholder="Full Name" className="w-full p-6 bg-white/10 border border-white/20 rounded-[2rem] font-bold text-lg outline-none focus:border-emerald-400 transition-all" />
                  <input name="village" required placeholder="Village / Location" className="w-full p-6 bg-white/10 border border-white/20 rounded-[2rem] font-bold text-lg outline-none focus:border-emerald-400 transition-all" />
                </>
              )}
              <input name="email" type="email" required placeholder="Email Address" className="w-full p-6 bg-white/10 border border-white/20 rounded-[2rem] font-bold text-lg outline-none focus:border-emerald-400 transition-all" />
              <input name="password" type="password" required placeholder="Password" className="w-full p-6 bg-white/10 border border-white/20 rounded-[2rem] font-bold text-lg outline-none focus:border-emerald-400 transition-all" />
              <button type="submit" disabled={authLoading} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-3xl active:scale-95 transition-all relative overflow-hidden">
                {authLoading && <div className="absolute inset-0 shimmer opacity-30"></div>}
                {authLoading ? 'Verifying...' : (isLogin ? 'Log In' : 'Sign Up')}
              </button>
            </form>
            <button onClick={() => setView(isLogin ? 'signup' : 'login')} className="w-full text-emerald-400 font-black uppercase tracking-widest text-[10px]">
              {isLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
            </button>
          </div>
        </div>
      );
    }
  }

  const renderHome = () => (
    <div className="animate-view-entry space-y-8">
      <section className={`${cardClasses} p-8 rounded-[3rem] overflow-hidden relative group hover-lift hover:shadow-emerald-500/20`}>
        <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Live Intelligence</p>
              <h2 className="text-4xl font-black tracking-tight">{state.weatherSnapshot[0]?.temp || 24}°C</h2>
              <p className={`text-sm font-bold ${subTextClasses} capitalize mt-1`}>{state.weatherSnapshot[0]?.condition || 'Clear'} Sky</p>
            </div>
            <div className="text-6xl animate-bounce-slow transition-transform duration-700 group-hover:rotate-12 group-hover:scale-125">
              {state.weatherSnapshot[0]?.condition === 'sunny' ? '☀️' : state.weatherSnapshot[0]?.condition === 'rainy' ? '🌧️' : '☁️'}
            </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-8">
          {state.weatherSnapshot.slice(1).map((w, i) => (
            <div key={i} className="text-center">
              <p className="text-[8px] font-black opacity-40 uppercase mb-1">{w.date.split('/')[0]}/{w.date.split('/')[1]}</p>
              <p className="text-lg font-bold">{w.temp}°</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-end justify-between px-2">
        <div>
            <h2 className={`text-3xl font-black ${textClasses} tracking-tighter animate-in slide-in-from-left-4`}>Hello, {state.user?.name.split(' ')[0]}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {state.isOnline ? 'Cloud Synced' : 'Local Computing'}</p>
        </div>
      </div>

      <section className="space-y-4">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Field Priorities</h3>
         {insights.length > 0 ? (
           <div className="flex gap-4 overflow-x-auto pb-4 scroll-hide">
              {insights.map((ins, i) => (
                <div key={i} className={`min-w-[280px] p-6 rounded-[2.5rem] border-l-8 ${ins.priority === InsightPriority.CRITICAL ? 'bg-rose-500/10 border-rose-500' : 'bg-amber-500/10 border-amber-500'}`}>
                  <h4 className="font-black text-sm uppercase tracking-tight">{ins.title}</h4>
                  <p className="text-xs font-bold opacity-70 mt-2 leading-relaxed">{ins.description}</p>
                  <p className="text-[10px] font-black uppercase mt-4 opacity-40">{ins.category} • {ins.actionDate}</p>
                </div>
              ))}
           </div>
         ) : (
           <div className={`${cardClasses} p-12 rounded-[3rem] text-center border-2 border-dashed`}>
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Your fields are optimized.</p>
           </div>
         )}
      </section>

      <section className="space-y-4">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Market Pulse</h3>
         <div className={`${cardClasses} p-6 rounded-[2.5rem] grid grid-cols-2 gap-4`}>
            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
               <p className="text-[10px] font-black opacity-50 uppercase">Rice (Basmati)</p>
               <p className="text-lg font-black text-emerald-600 mt-1">↑ ₹4,200/q</p>
            </div>
            <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
               <p className="text-[10px] font-black opacity-50 uppercase">Cotton (Long)</p>
               <p className="text-lg font-black text-rose-600 mt-1">↓ ₹6,800/q</p>
            </div>
         </div>
      </section>
    </div>
  );

  const renderAddCrop = () => (
    <div className="animate-view-entry space-y-8">
      <div className="flex items-center gap-4"><button onClick={() => setView('crops')} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl">←</button><h2 className={`text-3xl font-black ${textClasses} tracking-tighter`}>New Field</h2></div>
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const newCrop: FarmerCrop = { id: Math.random().toString(36).substr(2, 9), type: f.get('type') as CropType, nickname: f.get('nickname') as string, sowingDate: f.get('sowingDate') as string, soilType: f.get('soilType') as SoilType, region: f.get('region') as string }; setState(p => ({ ...p, crops: [...p.crops, newCrop] })); setView('crops'); }} className="space-y-6">
        <div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-40 ml-4">Plot Nickname</label><input name="nickname" required placeholder="e.g. North Ridge Field" className="w-full p-6 bg-white/50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all font-bold" /></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-40 ml-4">Crop Type</label><select name="type" className="w-full p-6 bg-white/50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 font-bold">{Object.keys(CROP_DATASETS).map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-40 ml-4">Soil Texture</label><select name="soilType" className="w-full p-6 bg-white/50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 font-bold">{Object.keys(SOIL_PROFILES).map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
        <div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-40 ml-4">Sowing Date</label><input type="date" name="sowingDate" required className="w-full p-6 bg-white/50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 font-bold" /></div>
        <button type="submit" className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-3xl hover:bg-emerald-500 active:scale-95 transition-all">Register Field</button>
      </form>
    </div>
  );

  const renderCropDetail = () => {
    if (!selectedCrop) return null;
    const stage = calculateGrowthStage(selectedCrop.type, selectedCrop.sowingDate);
    const data = CROP_DATASETS[selectedCrop.type].advisories[stage];
    const sowing = new Date(selectedCrop.sowingDate);
    const daysSince = Math.floor((Date.now() - sowing.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <div className="animate-view-entry space-y-8 pb-10">
        <div className="flex items-center justify-between"><button onClick={() => setView('crops')} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl">←</button><button className="text-[10px] font-black text-rose-500 uppercase tracking-widest" onClick={() => { setState(p => ({ ...p, crops: p.crops.filter(c => c.id !== selectedCropId) })); setView('crops'); }}>Remove Field</button></div>
        <div className="text-center space-y-2"><div className="text-7xl mb-4">{CROP_ICONS[selectedCrop.type]}</div><h2 className="text-4xl font-black tracking-tighter">{selectedCrop.nickname}</h2><p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">{selectedCrop.type} • {stage}</p></div>
        <div className={`${cardClasses} p-8 rounded-[3rem] flex items-center justify-between`}><div className="space-y-1"><p className="text-4xl font-black">{daysSince}</p><p className="text-[10px] font-black opacity-40 uppercase">Days Since Sowing</p></div><div className="w-24 h-24 relative"><svg className="w-full h-full -rotate-90" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="4" /><circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-500" strokeWidth="4" strokeDasharray="100" strokeDashoffset={100 - (daysSince / 1.5)} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center text-[10px] font-black">PROGRESS</div></div></div>
        <section className="space-y-4"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Today's Protocol</h3><div className="space-y-4">{[{ label: 'Fertilizer', icon: '🧪', value: data.fertilizer }, { label: 'Irrigation', icon: '💧', value: data.irrigation }, { label: 'Pest Risk', icon: '🐛', value: data.pestAlert }].map((item, i) => (<div key={i} className={`${cardClasses} p-6 rounded-[2rem] flex items-center gap-6`}><div className="text-3xl">{item.icon}</div><div><p className="text-[10px] font-black opacity-40 uppercase">{item.label}</p><p className="text-sm font-bold mt-1">{item.value}</p></div></div>))}</div></section>
        <section className={`${cardClasses} p-8 rounded-[3rem] bg-emerald-600 text-white`}><h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">Expert Tips for {stage}</h3><ul className="space-y-4">{data.tips.map((tip, i) => (<li key={i} className="flex gap-3 text-sm font-bold"><span className="opacity-50">0{i+1}.</span>{tip}</li>))}</ul></section>
      </div>
    );
  };

  const renderDiagnostics = () => (
    <div className="animate-view-entry space-y-8 pb-10">
      <div className="flex justify-between items-end"><h2 className={`text-4xl font-black ${textClasses} tracking-tighter leading-none`}>AI Lab</h2><button onClick={() => setView('caseLog')} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest underline decoration-2 underline-offset-4">Case History</button></div>
      <div className={`${cardClasses} p-8 rounded-[3rem] space-y-6 border-2 border-emerald-500/20`}><div className="space-y-2"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-4">Visual Evidence</p><div className="relative group overflow-hidden rounded-[2rem] aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">{diagImage ? <img src={diagImage} className="w-full h-full object-cover" /> : <div className="text-center space-y-2"><span className="text-4xl block opacity-30">📸</span><p className="text-[10px] font-black opacity-30">UPLOAD SYMPTOM PHOTO</p></div>}<input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />{diagImage && <button onClick={() => setDiagImage(null)} className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg">✕</button>}</div></div><div className="space-y-2"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-4">Voice Description</p><div className="flex gap-3"><textarea value={diagText} onChange={(e) => setDiagText(e.target.value)} placeholder="Describe leaf spots, pests, or wilting..." className="flex-1 p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] min-h-[120px] outline-none border border-slate-200 dark:border-slate-700 font-bold text-sm" /><button onMouseDown={() => startListening('diagnostics')} onMouseUp={() => stopListening('diagnostics')} className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse text-white' : 'bg-emerald-500 text-white'}`}>{isRecording ? '⏺' : '🎤'}</button></div></div><button onClick={runDiagnostic} disabled={isThinking || (!diagText && !diagImage)} className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-3xl transition-all ${isThinking ? 'bg-slate-300 pointer-events-none' : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'}`}>{isThinking ? 'Analyzing Patterns...' : 'Run Lab Analysis'}</button></div>
      {diagResult && (<div className="animate-in slide-in-from-bottom-8 duration-500 space-y-4"><h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] ml-2">Diagnostic Result</h3><div className={`${cardClasses} p-8 rounded-[3rem] prose dark:prose-invert font-bold text-sm leading-relaxed whitespace-pre-line`}>{diagResult}</div><button onClick={() => { setDiagResult(null); setDiagText(''); setDiagImage(null); }} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Clear Lab</button></div>)}
    </div>
  );

  const renderLibrary = () => (
    <div className="animate-view-entry space-y-8">
      <h2 className={`text-4xl font-black ${textClasses} tracking-tighter leading-none`}>Knowledge</h2>
      <div className="grid gap-6">{[{ title: 'Organic Pest Control', img: IMAGES.pestControl, desc: 'Natural sprays using Neem and garlic.' }, { title: 'Soil Restoration', img: IMAGES.soilCare, desc: 'Mastering vermicompost and cover crops.' }, { title: 'Market Access', img: IMAGES.schemes, desc: 'Connecting directly to urban buyers.' }, { title: 'Water Smart', img: IMAGES.homeHero, desc: 'Drip irrigation and sensor networks.' }].map((item, i) => (<div key={i} className={`${cardClasses} rounded-[2.5rem] overflow-hidden flex flex-col hover-lift cursor-pointer`}><img src={item.img} className="h-40 w-full object-cover" /><div className="p-6"><h4 className="font-black text-lg">{item.title}</h4><p className="text-xs font-bold opacity-60 mt-1">{item.desc}</p><button className="mt-4 text-[9px] font-black text-emerald-600 uppercase tracking-widest">Read Protocol →</button></div></div>))}</div>
    </div>
  );

  const renderCaseLog = () => (
    <div className="animate-view-entry space-y-8">
      <div className="flex items-center gap-4"><button onClick={() => setView('diagnostics')} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl">←</button><h2 className={`text-3xl font-black ${textClasses} tracking-tighter`}>Consultation History</h2></div>
      {state.diagnosticHistory.length === 0 ? <div className="text-center p-20 opacity-30"><span className="text-6xl block mb-4">📂</span><p className="text-xs font-black uppercase">No cases logged.</p></div> : <div className="space-y-6">{state.diagnosticHistory.map(item => (<div key={item.id} className={`${cardClasses} p-6 rounded-[2.5rem] space-y-4`}><div className="flex justify-between items-start"><div><h4 className="font-black text-lg">{item.cropNickname}</h4><p className="text-[10px] font-black opacity-40 uppercase">{item.timestamp}</p></div>{item.imageUrl && <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover" />}</div><div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-bold line-clamp-3 opacity-70 italic border-l-4 border-emerald-500">{item.diagnosis}</div></div>))}</div>}
    </div>
  );

  return (
    <div className={`h-screen max-w-md mx-auto flex flex-col shadow-3xl overflow-hidden font-['Inter'] transition-colors duration-500 ${themeClasses}`}>
      <header className={`${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-100'} backdrop-blur-md px-6 py-5 flex justify-between items-center sticky top-0 z-[100] border-b pt-safe shadow-sm shrink-0 transition-all`}>
        <div className="flex items-center gap-4"><div onClick={() => setView('home')} className="cursor-pointer active:scale-90 hover:scale-105 transition-all"><Logo size="sm" /></div><div><div className="flex items-center gap-1.5 mt-1"><span className={`w-2 h-2 rounded-full ${state.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-bounce'}`}></span><span className={`text-[9px] font-black uppercase tracking-widest ${state.isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>{state.isOnline ? 'Sync Active' : 'Offline Mode'}</span></div></div></div>
        <div className="flex gap-2"><button onClick={() => setView('caseLog')} className={`${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'} w-12 h-12 rounded-2xl flex items-center justify-center transition-all`}><span className="text-xl">📋</span></button><button onClick={handleSync} className={`${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'} w-12 h-12 border rounded-2xl flex items-center justify-center transition-all`}><svg className={`w-6 h-6 ${state.isOnline ? 'animate-spin-slow' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button></div>
      </header>
      <main className="flex-1 overflow-y-auto relative p-6 space-y-8 pb-40 transition-all duration-500 scroll-smooth">
        {view === 'home' && renderHome()}
        {view === 'crops' && (
          <div className="animate-view-entry space-y-8"><div className="flex justify-between items-end"><h2 className={`text-4xl font-black ${textClasses} tracking-tighter leading-none`}>My Fields</h2><button onClick={() => setView('add')} className="w-16 h-16 bg-emerald-600 text-white rounded-[2rem] shadow-3xl flex items-center justify-center text-4xl hover:scale-110 transition-all">+</button></div><div className="grid gap-6">{state.crops.map(c => (<div key={c.id} onClick={() => { setSelectedCropId(c.id); setView('detail'); }} className={`${cardClasses} p-8 rounded-[3rem] flex items-center gap-6 hover-lift cursor-pointer`}><div className="text-5xl">{CROP_ICONS[c.type]}</div><div><h4 className="font-black text-xl">{c.nickname}</h4><p className="text-[10px] font-black opacity-40 uppercase">{c.type} • {calculateGrowthStage(c.type, c.sowingDate)}</p></div></div>))}{state.crops.length === 0 && <div className="text-center p-20 opacity-30 border-2 border-dashed border-slate-300 rounded-[3rem]"><p className="text-xs font-black uppercase">No fields registered yet.</p></div>}</div></div>
        )}
        {view === 'add' && renderAddCrop()}
        {view === 'detail' && renderCropDetail()}
        {view === 'diagnostics' && renderDiagnostics()}
        {view === 'caseLog' && renderCaseLog()}
        {view === 'library' && renderLibrary()}
        {view === 'settings' && (
           <div className="animate-view-entry space-y-8"><h2 className={`text-4xl font-black ${textClasses} tracking-tighter`}>Settings</h2><div className={`${cardClasses} p-8 rounded-[3rem] space-y-6`}><div className="flex items-center gap-6"><img src={IMAGES.avatar} className="w-20 h-20 rounded-full border-4 border-emerald-500" /><div><h3 className="font-black text-xl">{state.user?.name}</h3><p className="text-xs opacity-50">{state.user?.village}</p></div></div><hr className="opacity-10" /><div className="space-y-4"><div className="flex justify-between items-center"><span className="font-bold text-sm">Theme</span><button onClick={() => setState(p => ({ ...p, settings: { ...p.settings, theme: p.settings.theme === 'light' ? 'dark' : 'light' } }))} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase">{state.settings.theme}</button></div><button onClick={() => { setState(p => ({ ...p, user: null })); setView('onboarding'); }} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-10">Logout</button></div></div></div>
        )}
      </main>
      <nav className={`${isDarkMode ? 'bg-slate-800/95 border-slate-700 shadow-emerald-950/40' : 'bg-white/95 border-slate-100 shadow-3xl'} fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-3xl border-t grid grid-cols-5 pt-4 pb-10 px-4 z-[200] h-[110px] shrink-0 transition-all duration-500`}><NavItem id="home" icon="🏠" label="Home" /><NavItem id="crops" icon="🌾" label="Lands" /><NavItem id="diagnostics" icon="🧪" label="Lab" /><NavItem id="library" icon="📖" label="Study" /><NavItem id="settings" icon="⚙️" label="Menu" /></nav>
    </div>
  );
};

export default App;
