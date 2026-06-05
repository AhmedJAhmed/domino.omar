/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Moon, 
  Sun, 
  RotateCcw, 
  Undo2, 
  Plus, 
  Settings, 
  History, 
  Gamepad2, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Trash2, 
  User, 
  Check, 
  Sparkles,
  HelpCircle,
  X,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playScoreSound, playUndoSound, playVictorySound, speakArabic } from './utils/audio';
import {Round, MatchHistory, GameSettings} from './types';

export default function App() {
  // -------------------------------------------------------------
  // Load State from LocalStorage
  // -------------------------------------------------------------
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('domino_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new settings are backward compatible
        return {
          team1Name: parsed.team1Name || 'فريق ١',
          team2Name: parsed.team2Name || 'فريق ٢',
          winningScore: Number(parsed.winningScore) || 151,
          soundEnabled: parsed.soundEnabled !== undefined ? parsed.soundEnabled : true,
          theme: parsed.theme || 'light',
          vibrationEnabled: parsed.vibrationEnabled !== undefined ? parsed.vibrationEnabled : true,
        };
      } catch (e) {
        console.error(e);
      }
    }
    return {
      team1Name: 'فريق ١',
      team2Name: 'فريق ٢',
      winningScore: 151,
      soundEnabled: true,
      theme: 'light',
      vibrationEnabled: true,
    };
  });

  const [score1, setScore1] = useState<number>(() => {
    const saved = localStorage.getItem('domino_score1');
    return saved ? Number(saved) : 0;
  });

  const [score2, setScore2] = useState<number>(() => {
    const saved = localStorage.getItem('domino_score2');
    return saved ? Number(saved) : 0;
  });

  const [history, setHistory] = useState<Round[]>(() => {
    const saved = localStorage.getItem('domino_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [matches, setMatches] = useState<MatchHistory[]>(() => {
    const saved = localStorage.getItem('domino_matches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Active inputs for keyboard score adding
  const [input1, setInput1] = useState<string>('');
  const [input2, setInput2] = useState<string>('');

  // Floating score addition animations
  const [floatingEffects, setFloatingEffects] = useState<Array<{ id: string; amount: number; team: 1 | 2 }>>([]);

  // Active Team toggle for Quick-add chips (Default Team 1)
  const [selectedTeam, setSelectedTeam] = useState<1 | 2>(1);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'play' | 'settings' | 'history'>('play');

  // Modals / Overlays
  const [showWinner, setShowWinner] = useState<boolean>(false);
  const [winnerTeam, setWinnerTeam] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Direct inline name editing states
  const [editingName1, setEditingName1] = useState<boolean>(false);
  const [editingName2, setEditingName2] = useState<boolean>(false);

  // Refs for auto scrolling in history
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Input elements refs for auto-focus control
  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone (PWA) mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to show the install button
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
      console.log('DOMINO App was installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  // -------------------------------------------------------------
  // Persistent Storage Sync
  // -------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem('domino_settings', JSON.stringify(settings));
    // Apply theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('domino_score1', score1.toString());
  }, [score1]);

  useEffect(() => {
    localStorage.setItem('domino_score2', score2.toString());
  }, [score2]);

  useEffect(() => {
    localStorage.setItem('domino_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('domino_matches', JSON.stringify(matches));
  }, [matches]);

  // Check if a team reached the winning score threshold
  useEffect(() => {
    if (score1 >= settings.winningScore && score1 > score2 && !showWinner) {
      triggerWinner(settings.team1Name, 'team1');
    } else if (score2 >= settings.winningScore && score2 > score1 && !showWinner) {
      triggerWinner(settings.team2Name, 'team2');
    }
  }, [score1, score2, settings.winningScore]);

  // -------------------------------------------------------------
  // Logic Functions
  // -------------------------------------------------------------
  const triggerWinner = (teamName: string, key: 'team1' | 'team2') => {
    setWinnerTeam(teamName);
    setShowWinner(true);
    if (settings.soundEnabled) {
      playVictorySound();
      speakArabic(`مبروك فوز ${teamName} بالمباراة`);
    }

    // Save completed match to matches
    const newMatch: MatchHistory = {
      id: Date.now().toString(),
      team1Name: settings.team1Name,
      team2Name: settings.team2Name,
      team1Score: score1,
      team2Score: score2,
      winner: key,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })
    };
    setMatches(prev => [newMatch, ...prev]);
  };

  const speakScoreComment = (addedVal: number, n1: number, n2: number) => {
    if (!settings.soundEnabled) return;
    if (n1 === n2) {
      speakArabic(`زائد ${addedVal}. النتيجة الآن تعادل ${n1}`);
    } else {
      const leadingTeam = n1 > n2 ? settings.team1Name : settings.team2Name;
      const leadingScore = Math.max(n1, n2);
      const minScore = Math.min(n1, n2);
      speakArabic(`زائد ${addedVal}. ${leadingTeam} متصدر بـ ${leadingScore} مقابل ${minScore}`);
    }
  };

  const addScore = (team: 1 | 2) => {
    const rawVal = team === 1 ? input1 : input2;
    const val = parseInt(rawVal, 10);
    
    if (isNaN(val) || val <= 0) {
      if (team === 1) {
        input1Ref.current?.focus();
      } else {
        input2Ref.current?.focus();
      }
      return;
    }

    // Trigger sound
    if (settings.soundEnabled) playScoreSound();

    // Trigger floating pop-up effect
    const effectId = Date.now().toString() + '-' + Math.random();
    setFloatingEffects(prev => [...prev, { id: effectId, amount: val, team }]);
    setTimeout(() => {
      setFloatingEffects(prev => prev.filter(e => e.id !== effectId));
    }, 1800);

    // Save round in history
    let nextScore1 = score1;
    let nextScore2 = score2;

    if (team === 1) {
      nextScore1 += val;
      setScore1(nextScore1);
      setInput1('');
    } else {
      nextScore2 += val;
      setScore2(nextScore2);
      setInput2('');
    }

    const newRound: Round = {
      id: Date.now().toString(),
      team1Added: team === 1 ? val : 0,
      team2Added: team === 2 ? val : 0,
      team1Total: nextScore1,
      team2Total: nextScore2,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory(prev => [...prev, newRound]);

    // Speak update out loud
    speakScoreComment(val, nextScore1, nextScore2);
  };

  const quickAdd = (amount: number) => {
    // Adds directly to the currently selected team's score with undo support
    if (settings.soundEnabled) playScoreSound();

    let nextScore1 = score1;
    let nextScore2 = score2;

    if (selectedTeam === 1) {
      nextScore1 += amount;
      setScore1(nextScore1);
    } else {
      nextScore2 += amount;
      setScore2(nextScore2);
    }

    const effectId = Date.now().toString() + '-' + Math.random();
    setFloatingEffects(prev => [...prev, { id: effectId, amount, team: selectedTeam }]);
    setTimeout(() => {
      setFloatingEffects(prev => prev.filter(e => e.id !== effectId));
    }, 1800);

    const newRound: Round = {
      id: Date.now().toString(),
      team1Added: selectedTeam === 1 ? amount : 0,
      team2Added: selectedTeam === 2 ? amount : 0,
      team1Total: nextScore1,
      team2Total: nextScore2,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory(prev => [...prev, newRound]);

    // Speak update out loud
    speakScoreComment(amount, nextScore1, nextScore2);
  };

  const undoLast = () => {
    if (history.length === 0) return;
    
    if (settings.soundEnabled) playUndoSound();
    
    const nextHistory = [...history];
    const lastRound = nextHistory.pop();
    
    if (lastRound) {
      // Revert scores
      if (lastRound.team1Added > 0) {
        setScore1(prev => Math.max(0, prev - lastRound.team1Added));
      } else if (lastRound.team2Added > 0) {
        setScore2(prev => Math.max(0, prev - lastRound.team2Added));
      }
      setHistory(nextHistory);
    }
  };

  const resetGame = () => {
    setScore1(0);
    setScore2(0);
    setHistory([]);
    setInput1('');
    setInput2('');
  };

  const startNewMatch = () => {
    resetGame();
    setShowWinner(false);
  };

  const clearMatchHistoryLog = () => {
    if (confirm('هل أنت متأكد من مسح تاريخ جميع المباريات؟')) {
      setMatches([]);
    }
  };

  return (
    <div 
      className={`min-h-screen font-sans bg-[#F9F9FB] dark:bg-[#0E121E] text-[#1E2330] dark:text-[#E2E8F0] flex flex-col transition-colors duration-300 md:pb-0 ${settings.theme === 'dark' ? 'dark' : ''}`}
      dir="rtl"
    >
      {/* Floating animations container */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingEffects.map((eff) => (
            <motion.div
              key={eff.id}
              initial={{ opacity: 0, y: 150, scale: 0.8 }}
              animate={{ opacity: 1, y: -200, scale: 1.4 }}
              exit={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className={`absolute font-bold text-5xl md:text-6xl drop-shadow-lg ${
                eff.team === 1 
                  ? 'right-[25%] text-indigo-600 dark:text-indigo-400' 
                  : 'left-[25%] text-blue-600 dark:text-blue-400'
              }`}
            >
              +{eff.amount}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* -------------------------------------------------------------
          TOP BAR & NAVIGATION HEADER
         ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#151B2E]/80 backdrop-blur-md border-b border-indigo-100/50 dark:border-indigo-900/30 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-l from-indigo-700 to-blue-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-blue-300">
              دومينو عمر الهاشم
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium font-sans">قيد نقاطك بكل دقة وسهولة</p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          {/* Theme switcher */}
          <button
            onClick={() => setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }))}
            className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all active:scale-95 tooltip"
            title="تبديل المظهر"
          >
            {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Quick Sound Toggle */}
          <button
            onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all active:scale-95"
          >
            {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MAIN PANELS
         ------------------------------------------------------------- */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col gap-5 pb-24 md:pb-8">
        
        {/* PWA Custom Install Banner */}
        <AnimatePresence>
          {showInstallButton && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -15 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -15 }}
              className="overflow-hidden"
            >
              <div id="pwa-install-banner" className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-md border border-indigo-500/20 gap-4 mb-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Download size={22} className="text-indigo-100 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">تثبيت تطبيق دومينو عمر</h3>
                    <p className="text-[11px] text-indigo-150 mt-0.5 leading-relaxed">ثبّت التطبيق على جهازك للوصول السريع والعمل دون اتصال بالإنترنت!</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleInstallClick}
                    className="bg-white text-indigo-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-50 active:scale-95 transition-all shadow-sm"
                  >
                    تثبيت الآن
                  </button>
                  <button
                    onClick={() => setShowInstallButton(false)}
                    className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all"
                    title="تجاهل"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active tab content router */}
        <AnimatePresence mode="wait">
          {activeTab === 'play' && (
            <motion.div
              key="play"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              {/* Quick statistics / threshold bar */}
              <div className="bg-indigo-50/50 dark:bg-[#151B2E]/50 border border-indigo-100/30 dark:border-indigo-950/50 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-indigo-700/90 dark:text-indigo-300">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>دومينو نشط حتى: <strong className="text-sm text-indigo-900 dark:text-indigo-100 font-bold">{settings.winningScore}</strong> نقطة</span>
                </div>
                <div>
                  جولات المباراة: <strong className="text-sm dark:text-indigo-200 font-bold">{history.length}</strong>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SCORE CARDS (Grid representing players / team leaders)
                 ------------------------------------------------------------- */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Team 2 Card (Left as per layout in image with RTL direction) */}
                <div 
                  onClick={() => {
                    setSelectedTeam(2);
                    setTimeout(() => input2Ref.current?.focus(), 50);
                  }}
                  className={`relative cursor-pointer transition-all duration-300 rounded-[2rem] p-5 flex flex-col items-center justify-center border-2 overflow-hidden ${
                    selectedTeam === 2 
                      ? 'border-indigo-600 dark:border-indigo-400 bg-white dark:bg-[#1B233D] shadow-xl shadow-indigo-100/40 dark:shadow-none scale-[1.02]' 
                      : 'border-transparent bg-white/70 dark:bg-[#151B30]/60 hover:bg-white dark:hover:bg-[#182038] shadow-sm'
                  }`}
                >
                  {/* Leading Badge */}
                  {score2 > score1 && score2 > 0 && (
                    <span className="absolute top-3 left-3 bg-indigo-600 text-white dark:bg-indigo-500 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                      <Trophy size={10} fill="currentColor" /> متصدر
                    </span>
                  )}

                  {editingName2 ? (
                    <input
                      type="text"
                      className="text-lg font-bold text-center text-[#1E2330] dark:text-white mt-2 bg-indigo-50/70 dark:bg-indigo-950/50 px-4 py-1 border-b-2 border-indigo-500 focus:outline-none w-[90%] text-ellipsis overflow-hidden"
                      value={settings.team2Name}
                      autoFocus
                      maxLength={14}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setSettings(prev => ({ ...prev, team2Name: e.target.value }))}
                      onBlur={() => {
                        setEditingName2(false);
                        if (!settings.team2Name.trim()) {
                          setSettings(prev => ({ ...prev, team2Name: 'فريق ٢' }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingName2(false);
                        }
                      }}
                    />
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName2(true);
                      }}
                      className="text-lg md:text-xl font-black text-indigo-950 dark:text-indigo-100 mt-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer border-b border-dashed border-indigo-200 dark:border-indigo-800/60 pb-0.5 hover:scale-[1.03]"
                      title="اضغط لتغيير الاسم"
                    >
                      <span>{settings.team2Name}</span>
                    </button>
                  )}

                  {/* Huge Score Counter */}
                  <div className="text-7xl font-extrabold font-display-score my-4 tracking-tighter text-indigo-950 dark:text-white drop-shadow-sm select-none">
                    {score2}
                  </div>

                  <div className="w-full flex flex-col gap-2.5 mt-2">
                    {/* Input Field nested */}
                    <input 
                      ref={input2Ref}
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => setSelectedTeam(2)}
                      placeholder="٠"
                      value={input2}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, '');
                        setInput2(cleaned);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addScore(2);
                        }
                      }}
                      className="w-full text-center bg-gray-50 dark:bg-[#101524] border-0 outline-none rounded-[1.25rem] py-3 text-lg font-bold text-indigo-950 dark:text-white focus:ring-2 focus:ring-indigo-500/80 transition-all"
                    />

                    {/* Add Score button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addScore(2);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 font-bold rounded-[1.25rem] py-3.5 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 hover:shadow-indigo-500/15"
                    >
                      <Plus size={18} />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>

                {/* Team 1 Card (Right as per RTL design layout) */}
                <div 
                  onClick={() => {
                    setSelectedTeam(1);
                    setTimeout(() => input1Ref.current?.focus(), 50);
                  }}
                  className={`relative cursor-pointer transition-all duration-300 rounded-[2rem] p-5 flex flex-col items-center justify-center border-2 overflow-hidden ${
                    selectedTeam === 1 
                      ? 'border-indigo-600 dark:border-indigo-400 bg-white dark:bg-[#1B233D] shadow-xl shadow-indigo-100/40 dark:shadow-none scale-[1.02]' 
                      : 'border-transparent bg-white/70 dark:bg-[#151B30]/60 hover:bg-white dark:hover:bg-[#182038] shadow-sm'
                  }`}
                >
                  {/* Leading Badge */}
                  {score1 > score2 && score1 > 0 && (
                    <span className="absolute top-3 left-3 bg-indigo-600 text-white dark:bg-indigo-500 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                      <Trophy size={10} fill="currentColor" /> متصدر
                    </span>
                  )}

                  {editingName1 ? (
                    <input
                      type="text"
                      className="text-lg font-bold text-center text-[#1E2330] dark:text-white mt-2 bg-indigo-50/70 dark:bg-indigo-950/50 px-4 py-1 border-b-2 border-indigo-500 focus:outline-none w-[90%] text-ellipsis overflow-hidden"
                      value={settings.team1Name}
                      autoFocus
                      maxLength={14}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setSettings(prev => ({ ...prev, team1Name: e.target.value }))}
                      onBlur={() => {
                        setEditingName1(false);
                        if (!settings.team1Name.trim()) {
                          setSettings(prev => ({ ...prev, team1Name: 'فريق ١' }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingName1(false);
                        }
                      }}
                    />
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName1(true);
                      }}
                      className="text-lg md:text-xl font-black text-indigo-950 dark:text-indigo-100 mt-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer border-b border-dashed border-indigo-200 dark:border-indigo-800/60 pb-0.5 hover:scale-[1.03]"
                      title="اضغط لتغيير الاسم"
                    >
                      <span>{settings.team1Name}</span>
                    </button>
                  )}

                  {/* Huge Score Counter */}
                  <div className="text-7xl font-extrabold font-display-score my-4 tracking-tighter text-indigo-950 dark:text-white drop-shadow-sm select-none">
                    {score1}
                  </div>

                  <div className="w-full flex flex-col gap-2.5 mt-2">
                    {/* Input Field nested */}
                    <input 
                      ref={input1Ref}
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => setSelectedTeam(1)}
                      placeholder="٠"
                      value={input1}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, '');
                        setInput1(cleaned);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addScore(1);
                        }
                      }}
                      className="w-full text-center bg-gray-50 dark:bg-[#101524] border-0 outline-none rounded-[1.25rem] py-3 text-lg font-bold text-indigo-950 dark:text-white focus:ring-2 focus:ring-indigo-500/80 transition-all"
                    />

                    {/* Add Score button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addScore(1);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 font-bold rounded-[1.25rem] py-3.5 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 hover:shadow-indigo-500/15"
                    >
                      <Plus size={18} />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* -------------------------------------------------------------
                  QUICK ADD CHIPS (Large ergonomic buttons)
                 ------------------------------------------------------------- */}
              <div className="flex flex-col items-center gap-2 mt-2 bg-white dark:bg-[#151B2E] p-4 rounded-[2rem] border border-gray-100 dark:border-indigo-950/40 shadow-sm">
                <span className="text-xs font-semibold text-gray-500">
                  إضافة سريعة لـ <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedTeam === 1 ? settings.team1Name : settings.team2Name}</strong>
                </span>
                
                <div className="grid grid-cols-4 gap-3 w-full">
                  {[5, 10, 20, 30].map((num) => (
                    <button
                      key={num}
                      onClick={() => quickAdd(num)}
                      className="bg-gray-50 dark:bg-[#182038] hover:bg-indigo-50 dark:hover:bg-indigo-950/45 text-indigo-950 dark:text-indigo-100 font-extrabold text-lg py-3 rounded-2xl border border-gray-100/80 dark:border-indigo-900/30 transition-all active:scale-90 hover:scale-[1.03] shadow-sm flex flex-col items-center justify-center"
                    >
                      <span>+{num}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* -------------------------------------------------------------
                  PRIMARY GAME CONTROLS & UTILITIES
                 ------------------------------------------------------------- */}
              <div className="flex flex-col gap-3 mt-1 bg-white/40 dark:bg-transparent backdrop-blur-sm p-2 rounded-[2rem]">
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Undo Button */}
                  <button 
                    onClick={undoLast}
                    disabled={history.length === 0}
                    className="h-14 bg-white dark:bg-[#151B2E] border border-gray-200 dark:border-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-indigo-950/70 rounded-2xl flex items-center justify-center gap-2 font-bold px-4 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  >
                    <Undo2 size={18} />
                    <span>تراجع</span>
                  </button>

                  {/* Reset Points button */}
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="h-14 bg-white dark:bg-[#151B2E] border border-red-200/50 dark:border-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl flex items-center justify-center gap-2 font-bold px-4 transition-all active:scale-95 shadow-sm"
                  >
                    <RotateCcw size={18} />
                    <span>تصفير الجولة</span>
                  </button>

                </div>

                {/* Match Game Reset button */}
                <button
                  onClick={startNewMatch}
                  className="h-14 w-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-100/80 transition-all active:scale-95 shadow-sm border border-indigo-100/20 dark:border-indigo-950/50"
                >
                  <Gamepad2 size={18} />
                  <span>مباراة جديدة</span>
                </button>
              </div>

              {/* -------------------------------------------------------------
                  CURRENT MATCH ROUNDS MINI-LOG
                 ------------------------------------------------------------- */}
              {history.length > 0 && (
                <div className="bg-white dark:bg-[#151B2E] p-5 rounded-[2rem] border border-gray-100 dark:border-indigo-950/40 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-indigo-950/40">
                    <span className="font-bold text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                      <History size={16} /> جولات المباراة الحالية
                    </span>
                    <span className="text-[11px] text-gray-400 font-semibold bg-gray-50 dark:bg-[#1A2035] px-2.5 py-1 rounded-full">
                      إجمالي الجولات: {history.length}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto flex flex-col gap-2 scrollbar-thin">
                    {history.map((rnd, idx) => (
                      <div 
                        key={rnd.id}
                        className="flex items-center justify-between text-xs py-2 px-3 hover:bg-gray-50 dark:hover:bg-indigo-950/20 rounded-xl transition-all"
                      >
                        <div className="text-gray-400 dark:text-indigo-400 font-bold">
                          الجولة {idx + 1}
                        </div>
                        <div className="flex items-center gap-4">
                          {rnd.team2Added > 0 && (
                            <span className="font-bold text-[#23a55a] dark:text-[#3cd070] bg-[#eafdcd]/50 dark:bg-[#1e3c27]/40 px-2 py-0.5 rounded-md">
                              +{rnd.team2Added} لـ {settings.team2Name}
                            </span>
                          )}
                          {rnd.team1Added > 0 && (
                            <span className="font-bold text-[#23a55a] dark:text-[#3cd070] bg-[#eafdcd]/50 dark:bg-[#1e3c27]/40 px-2 py-0.5 rounded-md">
                              +{rnd.team1Added} لـ {settings.team1Name}
                            </span>
                          )}
                          <span className="text-gray-500 font-mono">
                            {rnd.team2Total} : {rnd.team1Total}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={historyEndRef} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* -------------------------------------------------------------
              TAB: HISTORIC MATCHES & DETAILED STATS
             ------------------------------------------------------------- */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              {/* Score breakdown metrics cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#151B2E] p-4 rounded-3xl border border-gray-100 dark:border-indigo-950/40 shadow-sm">
                  <span className="text-xs text-gray-400 font-semibold block mb-1">المباريات المحفوظة</span>
                  <span className="text-2xl font-black text-indigo-950 dark:text-white block">{matches.length}</span>
                </div>
                <div className="bg-white dark:bg-[#151B2E] p-4 rounded-3xl border border-gray-100 dark:border-indigo-950/40 shadow-sm">
                  <span className="text-xs text-gray-400 font-semibold block mb-1">متصدر الإحصائيات</span>
                  <span className="text-lg font-bold text-[#23a55a] dark:text-[#3cd070] block truncate">
                    {matches.length === 0 ? 'لا يوجد مباريات بعد' : (
                      matches.filter(m => m.winner === 'team1').length >= matches.filter(m => m.winner === 'team2').length
                        ? settings.team1Name 
                        : settings.team2Name
                    )}
                  </span>
                </div>
                <div className="bg-white dark:bg-[#151B2E] p-4 rounded-3xl border border-gray-100 dark:border-indigo-950/40 shadow-sm">
                  <span className="text-xs text-gray-400 font-semibold block mb-1">فوز ({settings.team1Name})</span>
                  <span className="text-2xl font-black text-indigo-600 block">
                    {matches.filter(m => m.winner === 'team1').length}
                  </span>
                </div>
                <div className="bg-white dark:bg-[#151B2E] p-4 rounded-3xl border border-gray-100 dark:border-indigo-950/40 shadow-sm">
                  <span className="text-xs text-gray-400 font-semibold block mb-1">فوز ({settings.team2Name})</span>
                  <span className="text-2xl font-black text-[#4c616c] dark:text-[#7d909c] block">
                    {matches.filter(m => m.winner === 'team2').length}
                  </span>
                </div>
              </div>

              {/* Log List */}
              <div className="bg-white dark:bg-[#151B2E] p-6 rounded-[2rem] border border-gray-100 dark:border-indigo-950/40 shadow-sm">
                <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-indigo-950/40 mb-4">
                  <h3 className="font-bold text-lg text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                    <Trophy size={20} className="text-amber-500" /> سجل المباريات السابقة
                  </h3>
                  {matches.length > 0 && (
                    <button 
                      onClick={clearMatchHistoryLog}
                      className="text-xs text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Trash2 size={13} />
                      <span>مسح السجل</span>
                    </button>
                  )}
                </div>

                {matches.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-[#1a1f33] rounded-full flex items-center justify-center text-gray-300 dark:text-indigo-900 shadow-inner">
                      <History size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-500 dark:text-gray-400">سجل المباريات فارغ</p>
                      <p className="text-xs text-gray-400">النتائج النهائية ستظهر بعد فوز أحد الفريقين</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {matches.map((match) => (
                      <div 
                        key={match.id}
                        className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1a2034] border border-gray-100 dark:border-indigo-950/30 flex items-center justify-between transition-all hover:scale-[1.01]"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-indigo-950 dark:text-white text-sm">
                              {match.winner === 'team1' ? match.team1Name : match.team2Name}
                            </span>
                            <span className="bg-[#eafdcd] text-[#23a55a] dark:bg-[#1e3c27]/40 dark:text-[#3cd070] text-[9px] px-2 py-0.5 rounded-md font-bold">
                              فائز
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-1">{match.timestamp}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-semibold text-gray-400 block">النتيجة النهائية</span>
                            <span className="font-mono font-bold text-[#4c56af] dark:text-indigo-300">
                              {match.team1Score} : {match.team2Score}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------------------
              TAB: SETTINGS PANEL
             ------------------------------------------------------------- */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#151B2E] p-6 rounded-[2rem] border border-gray-100 dark:border-indigo-950/40 shadow-sm flex flex-col gap-6"
            >
              <h3 className="font-bold text-lg text-indigo-950 dark:text-indigo-100 border-b pb-3 border-gray-100 dark:border-indigo-950/30 flex items-center gap-2">
                <Settings size={20} className="text-indigo-600 dark:text-indigo-400" /> إعدادات وتخصيص اللعبة
              </h3>

              {/* Team Naming Section */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">تسمية الفريقين</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 font-semibold">اسم الفريق الأول</label>
                    <input 
                      type="text"
                      maxLength={14}
                      value={settings.team1Name}
                      onChange={(e) => setSettings(prev => ({ ...prev, team1Name: e.target.value }))}
                      onBlur={() => {
                        if (!settings.team1Name.trim()) {
                          setSettings(prev => ({ ...prev, team1Name: 'فريق ١' }));
                        }
                      }}
                      className="bg-gray-50 dark:bg-indigo-950/20 border-0 rounded-2xl py-3 px-4 font-bold text-indigo-950 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 font-semibold">اسم الفريق الثاني</label>
                    <input 
                      type="text"
                      maxLength={14}
                      value={settings.team2Name}
                      onChange={(e) => setSettings(prev => ({ ...prev, team2Name: e.target.value }))}
                      onBlur={() => {
                        if (!settings.team2Name.trim()) {
                          setSettings(prev => ({ ...prev, team2Name: 'فريق ٢' }));
                        }
                      }}
                      className="bg-gray-50 dark:bg-indigo-950/20 border-0 rounded-2xl py-3 px-4 font-bold text-indigo-950 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Win score target trigger */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">الحد الأقصى للنقاط (حاسم الحلة)</span>
                <div className="flex flex-wrap gap-2">
                  {[101, 151, 201].map((scorePreset) => (
                    <button
                      key={scorePreset}
                      onClick={() => setSettings(prev => ({ ...prev, winningScore: scorePreset }))}
                      className={`px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                        settings.winningScore === scorePreset 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-gray-50 dark:bg-indigo-950/20 text-[#1E2330] dark:text-indigo-200 border border-gray-100 dark:border-indigo-950/50 hover:bg-gray-100'
                      }`}
                    >
                      {scorePreset} نقطة
                    </button>
                  ))}
                  
                  {/* Custom threshold input */}
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-indigo-950/20 px-3 py-1 rounded-xl border border-gray-100 dark:border-indigo-950/40">
                    <span className="text-xs text-gray-400 font-semibold">مخصص:</span>
                    <input 
                      type="number"
                      value={settings.winningScore}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v > 0) {
                          setSettings(prev => ({ ...prev, winningScore: v }));
                        }
                      }}
                      className="bg-transparent border-0 outline-none w-16 text-center text-xs font-bold text-indigo-950 dark:text-white py-1 focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              {/* Sound and Speech Synthesis */}
              <div className="flex flex-col gap-4">
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">خيارات الصوت والمؤثرات</span>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a2034] rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-indigo-950 dark:text-white">المؤثرات الصوتية والتعليق الصوتي</span>
                    <span className="text-[10px] text-gray-500">سماع أصوات النقر وإجمالي النقاط عبر معالج النطق</span>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className={`w-14 h-8 rounded-full transition-all relative ${
                      settings.soundEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-indigo-950'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all shadow-md ${
                      settings.soundEnabled ? 'left-1' : 'left-7'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Installer Settings Option if installable */}
              {deferredPrompt && (
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50/60 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3" dir="rtl">
                    <Download className="text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" size={20} />
                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block">إضافة لسطح المكتب</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">تثبيت اللعبة كتطبيق كامل على جهازك مباشرة.</span>
                    </div>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-sm"
                  >
                    تثبيت التطبيق
                  </button>
                </div>
              )}

              {/* Game Rules / Hints */}
              <div className="bg-indigo-50/45 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-100/30 dark:border-indigo-900/10 flex items-start gap-3">
                <HelpCircle className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block mb-1">تعليمات مفيدة</span>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    - اضغط على زر "تراجع" لإلغاء الجمع غير الصحيح فورا.<br />
                    - لتعديل أسماء الفريقين بشكل سريع، انقر فوق أيقونة المستخدم الموجودة أعلى يمين بطاقة كل فريق.<br />
                    - يتم حفظ التقدم تلقائيًا حتى ولو تم إغلاق المتصفح عن طريق الخطأ.
                  </p>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* -------------------------------------------------------------
          TAB BAR / BOTTOM ACTIONS PANEL (Fixed safe-area responsive)
         ------------------------------------------------------------- */}
      <nav className="fixed bottom-0 left-0 w-full z-40 bg-white dark:bg-[#101524] border-t border-indigo-100 dark:border-indigo-950/70 shadow-lg px-6 py-2.5 flex justify-around items-center max-w-5xl mx-auto right-0 rounded-t-[1.75rem]">
        {/* Play Tab Button */}
        <button 
          onClick={() => setActiveTab('play')}
          className={`flex flex-col items-center gap-1.5 px-6 py-1 select-none transition-all duration-350 shrink-0 ${
            activeTab === 'play'
              ? 'text-indigo-600 dark:text-indigo-400 scale-[1.08]'
              : 'text-gray-400 hover:text-indigo-600'
          }`}
        >
          <Gamepad2 size={22} className={activeTab === 'play' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
          <span className="text-xs font-bold">لعب</span>
        </button>

        {/* History Tab Button */}
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1.5 px-6 py-1 select-none transition-all duration-350 shrink-0 ${
            activeTab === 'history'
              ? 'text-indigo-600 dark:text-indigo-400 scale-[1.08]'
              : 'text-gray-400 hover:text-indigo-600'
          }`}
        >
          <History size={22} className={activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
          <span className="text-xs font-bold">السجل</span>
        </button>

        {/* Settings Tab Button */}
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1.5 px-6 py-1 select-none transition-all duration-350 shrink-0 ${
            activeTab === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400 scale-[1.08]'
              : 'text-gray-400 hover:text-indigo-600'
          }`}
        >
          <Settings size={22} className={activeTab === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
          <span className="text-xs font-bold">الإعدادات</span>
        </button>
      </nav>

      {/* -------------------------------------------------------------
          MODALS & OVERLAYS
         ------------------------------------------------------------- */}
      
      {/* 1. Winner Overlay Modal with Trophy presentation */}
      <AnimatePresence>
        {showWinner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0E121E]/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-white dark:bg-[#151B2E] rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-indigo-100/20 dark:border-indigo-950 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Confetti decoration elements */}
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-indigo-500/20 to-transparent pointer-events-none" />
              <div className="absolute top-2 left-6 text-indigo-400 opacity-60 animate-bounce"><Sparkles size={24} /></div>
              <div className="absolute top-10 right-8 text-amber-400 opacity-60 animate-pulse"><Sparkles size={16} /></div>

              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg mb-6 relative">
                <Trophy size={48} className="text-white" fill="currentColor" />
                <span className="absolute -bottom-1 -right-1 bg-white dark:bg-[#151B2E] text-amber-500 p-1.5 rounded-full shadow-md"><Sparkles size={14} /></span>
              </div>

              <h2 className="text-3xl font-black text-indigo-950 dark:text-white mb-2">تهانينا الحارة!</h2>
              <p className="text-md text-gray-500 dark:text-gray-400 mb-2">الفائز بلقب هذه المباراة هو:</p>
              
              <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-xl px-6 py-3 rounded-2xl mb-8 border border-indigo-100/50 dark:border-indigo-900/30">
                {winnerTeam}
              </div>

              <button 
                onClick={startNewMatch}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus size={18} />
                <span>مباراة جديدة</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Reset Confirmation dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0E121E]/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151B2E] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-indigo-100/10 dark:border-indigo-950/40"
            >
              <h3 className="font-extrabold text-lg text-indigo-950 dark:text-white mb-2"> هل تريد تصفير نقاط الجولة الحالية؟</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                هذا الإجراء سيقوم بإلغاء جميع الجولات المقيدة للمباراة الحالية وإعادتها إلى الصفر. لن تتمكن من التراجع عن هذه الخطوة.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-3.5 bg-gray-50 dark:bg-indigo-950/20 text-[#1E2330] dark:text-indigo-200 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    resetGame();
                    setShowResetConfirm(false);
                  }}
                  className="py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
                >
                  تصفير فوري
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
