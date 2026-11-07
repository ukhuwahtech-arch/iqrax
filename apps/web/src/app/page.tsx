// C:\Users\dxiau\iqrax\apps\web\src\app\page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { IqraxTab } from "@/components/tabs/IqraxTab";
import { QuranTab } from "@/components/tabs/QuranTab";
import { TerjemahanTab } from "@/components/tabs/TerjemahanTab";
import { TajwidTab } from "@/components/tabs/TajwidTab";
import { WaktuSolatTab } from "@/components/tabs/WaktuSolatTab";

type HeaderViewType = "Iqrax" | "Quran" | "Terjemahan" | "Tajwid" | "Waktu Solat";

export default function Page() {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHeaderView, setActiveHeaderView] = useState<HeaderViewType>("Iqrax");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedTheme = localStorage.getItem("theme");
    const initialDark = savedTheme ? savedTheme === "dark" : prefersDark;
    
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderTabContent = () => {
    switch (activeHeaderView) {
      case "Iqrax":
        return <IqraxTab />;
      case "Quran":
        return <QuranTab />;
      case "Terjemahan":
        return <TerjemahanTab />;
      case "Tajwid":
        return <TajwidTab />;
      case "Waktu Solat":
        return <WaktuSolatTab />;
      default:
        return <IqraxTab />;
    }
  };

  return (
    <main 
      className="min-h-screen flex flex-col items-center px-4 sm:px-8 pb-8 transition-colors duration-300"
      style={{ paddingTop: '15px' }}
    >
      <div className="max-w-xl w-full space-y-6 relative">
        
        {/* Header Navigation with Perfectly Aligned Tops */}
        <div className="flex items-start justify-between">
          
          {/* Iqra^x Box Button aligned to the exact top line */}
          <div className="flex flex-col self-start">
            <button
              onClick={() => {
                setActiveHeaderView("Iqrax");
                setMenuOpen(false);
              }}
              aria-label="Iqrax"
              className={`w-[110px] h-12 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                activeHeaderView === "Iqrax"
                  ? "neu-pressed text-emerald-600 dark:text-emerald-400 font-black scale-[0.98]" 
                  : "neu-flat active:neu-pressed font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
              }`}
            >
              <span className="text-sm tracking-tight select-none">
                Iqra<span className="text-[10px] align-super">x</span>
              </span>
            </button>
          </div>

          <div className="flex items-start gap-2.5 sm:gap-3">
            
            {/* 1. Quran Icon Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setActiveHeaderView("Quran");
                  setMenuOpen(false);
                }}
                aria-label="Quran"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  activeHeaderView === "Quran"
                    ? "neu-pressed text-emerald-600 dark:text-emerald-400" 
                    : "neu-flat active:neu-pressed"
                }`}
              >
                <Image
                  src="/icons/quran.svg"
                  alt="Quran"
                  width={20}
                  height={20}
                  className="w-5 h-5 opacity-80 dark:invert"
                />
              </button>
              <span className="text-[10px] font-bold mt-1 text-amber-900/80 dark:text-amber-100/70 select-none">
                Quran
              </span>
            </div>

            {/* 2. Terjemahan Icon Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setActiveHeaderView("Terjemahan");
                  setMenuOpen(false);
                }}
                aria-label="Terjemahan"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  activeHeaderView === "Terjemahan"
                    ? "neu-pressed text-emerald-600 dark:text-emerald-400" 
                    : "neu-flat active:neu-pressed"
                }`}
              >
                <Image
                  src="/icons/terjemahan.svg"
                  alt="Terjemahan"
                  width={20}
                  height={20}
                  className="w-5 h-5 opacity-80 dark:invert"
                />
              </button>
              <span className="text-[10px] font-bold mt-1 text-amber-900/80 dark:text-amber-100/70 select-none">
                Terjemahan
              </span>
            </div>

            {/* 3. Tajwid Icon Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setActiveHeaderView("Tajwid");
                  setMenuOpen(false);
                }}
                aria-label="Tajwid"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  activeHeaderView === "Tajwid"
                    ? "neu-pressed text-emerald-600 dark:text-emerald-400" 
                    : "neu-flat active:neu-pressed"
                }`}
              >
                <Image
                  src="/icons/tajwid.svg"
                  alt="Tajwid"
                  width={20}
                  height={20}
                  className="w-5 h-5 opacity-80 dark:invert"
                />
              </button>
              <span className="text-[10px] font-bold mt-1 text-amber-900/80 dark:text-amber-100/70 select-none">
                Tajwid
              </span>
            </div>

            {/* 4. Waktu Solat Icon Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setActiveHeaderView("Waktu Solat");
                  setMenuOpen(false);
                }}
                aria-label="Waktu Solat"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  activeHeaderView === "Waktu Solat" 
                    ? "neu-pressed text-emerald-600 dark:text-emerald-400" 
                    : "neu-flat active:neu-pressed"
                }`}
              >
                <Image
                  src="/icons/waktu-solat.svg"
                  alt="Waktu Solat"
                  width={20}
                  height={20}
                  className="w-5 h-5 opacity-80 dark:invert"
                />
              </button>
              <span className="text-[10px] font-bold mt-1 text-amber-900/80 dark:text-amber-100/70 select-none">
                Waktu Solat
              </span>
            </div>

            {/* 5. 3-Dot Options Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Options Menu"
                className="w-10 h-10 rounded-full flex items-center justify-center neu-flat active:neu-pressed transition-all duration-200 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 opacity-80"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-2xl neu-flat p-2 z-50 transition-all duration-200 bg-white dark:bg-[#1e1e24] shadow-xl">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span>Theme Mode</span>
                    <span>{isDark ? "☀️ Light" : "🌙 Dark"}</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Dynamic Content Display */}
        <div className="mt-4">
          {renderTabContent()}
        </div>

      </div>
    </main>
  );
}