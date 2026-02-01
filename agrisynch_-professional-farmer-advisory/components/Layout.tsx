
import React from 'react';
import { Language, AppState } from '../types';
import { TRANSLATIONS } from '../constants';

interface LayoutProps {
  state: AppState;
  onLanguageToggle: () => void;
  onSync: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ state, onLanguageToggle, onSync, children }) => {
  const t = TRANSLATIONS[state.language];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-100 shadow-2xl overflow-hidden relative">
      {/* Primary Header */}
      <header className="bg-[#1a4d2e] text-white p-4 pt-6 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter">AG-1</h1>
            <p className="text-[9px] opacity-70 uppercase font-bold tracking-widest leading-none">Smart Rural Advisory</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onLanguageToggle}
            className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold border border-white/20 active:bg-white/20 transition-all uppercase"
          >
            {state.language === Language.ENGLISH ? 'हिन्दी' : 'English'}
          </button>
        </div>
      </header>

      {/* Persistence Bar */}
      <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${state.isOnline ? 'bg-green-400' : 'bg-orange-400'}`}></span>
          {state.isOnline ? t.syncStatus + ': Ready' : 'Mode: Offline Insights'}
        </div>
        <div className="flex items-center gap-3">
           <span className="opacity-50">v1.2 Prod</span>
           {state.isOnline && (
             <button onClick={onSync} className="text-emerald-400 hover:text-white transition-colors">Force Sync</button>
           )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto bg-[#f4f7f5] pb-24">
        {children}
      </main>

      {/* Navigation Stub */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-6 py-4 flex justify-around items-center z-40">
         <div className="flex flex-col items-center gap-1 opacity-100">
           <svg className="w-6 h-6 text-[#1a4d2e]" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
           <span className="text-[9px] font-bold uppercase">Home</span>
         </div>
         <div className="flex flex-col items-center gap-1 opacity-30">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
           <span className="text-[9px] font-bold uppercase">Stats</span>
         </div>
         <div className="flex flex-col items-center gap-1 opacity-30">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           <span className="text-[9px] font-bold uppercase">Profile</span>
         </div>
      </nav>
    </div>
  );
};

export default Layout;
