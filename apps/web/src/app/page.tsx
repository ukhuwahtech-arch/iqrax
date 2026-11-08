// apps/web/src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { IqraxTab } from "@/components/tabs/IqraxTab";
import { QuranTab } from "@/components/tabs/QuranTab";
import { TerjemahanTab } from "@/components/tabs/TerjemahanTab";
import { TajwidTab } from "@/components/tabs/TajwidTab";
import { WaktuSolatTab } from "@/components/tabs/WaktuSolatTab";
import { SearchBox } from "@/components/tabs/SearchBox";

type HeaderViewType = "Iqrax" | "Quran" | "Terjemahan" | "Tajwid" | "Waktu Solat";

interface Chapter {
  id: number;
  name_simple: string;
  name_arabic: string;
}

export default function Page() {
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHeaderView, setActiveHeaderView] = useState<HeaderViewType>("Iqrax");
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedTheme = localStorage.getItem("theme");
    const initialDark = savedTheme ? savedTheme === "dark" : prefersDark;
    
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Fetch chapters globally for quick search usage
    fetch("https://api.quran.com/api/v4/chapters?language=ms")
      .then((res) => res.json())
      .then((data) => setChapters(data.chapters || []))
      .catch((err) => console.error("Failed to load chapters:", err));
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

  // Global scroll listener for Header auto-hide & Scroll-to-Top visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollYRef.current;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      if (currentScrollY <= 10) {
        setShowScrollTop(false);
        setIsHeaderVisible(true);
      } else if (isScrollingDown) {
        setShowScrollTop(false);
        setIsHeaderVisible(false);
        setMenuOpen(false);
      } else {
        setShowScrollTop(true);
        setIsHeaderVisible(true);

        idleTimerRef.current = setTimeout(() => {
          if (window.scrollY > 50) {
            setIsHeaderVisible(false);
            setMenuOpen(false);
          }
        }, 2000);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderTabContent = () => {
    const isTerjemahan = activeHeaderView === "Terjemahan";

    return (
      <div className={isTerjemahan ? "h-auto overflow-visible pb-12" : "h-[calc(100vh-85px)] overflow-y-auto pr-1 custom-scrollbar"}>
        {(() => {
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
        })()}
      </div>
    );
  };

  return (
    <main 
      className={`flex flex-col items-center px-4 sm:px-8 transition-colors duration-300 relative ${
        activeHeaderView === "Terjemahan" ? "min-h-screen overflow-y-auto" : "h-screen overflow-hidden"
      }`}
      style={{ paddingTop: '2px' }}
    >
      <div className="max-w-xl w-full space-y-3 relative mt-[3px] h-full flex flex-col">
        
        {/* Global Floating Header */}
        <div 
          className={`sticky top-3 z-50 transition-all duration-500 ease-in-out backdrop-blur-md bg-transparent py-2 px-2 rounded-2xl shrink-0 ${
            isHeaderVisible 
              ? "opacity-100 translate-y-0 pointer-events-auto" 
              : "opacity-0 -translate-y-16 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between w-full px-1">
            
            {/* 1. Iqrax */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => { setActiveHeaderView("Iqrax"); setMenuOpen(false); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeHeaderView === "Iqrax" ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "neu-flat active:neu-pressed"
                }`}
              >
                <Image src="/icons/iqrax.svg" alt="Iqrax" width={20} height={20} className="w-5 h-5 opacity-80 dark:invert" />
              </button>
              <span className="text-[10px] font-sans font-medium mt-0.5 text-emerald-600 dark:text-emerald-400 select-none">
                Iqra<span className="text-[7px] align-super">x</span>
              </span>
            </div>

            {/* 2. Quran */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => { setActiveHeaderView("Quran"); setMenuOpen(false); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeHeaderView === "Quran" ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "neu-flat active:neu-pressed"
                }`}
              >
                <Image src="/icons/quran.svg" alt="Quran" width={20} height={20} className="w-5 h-5 opacity-80 dark:invert" />
              </button>
              <span className="text-[10px] font-sans font-medium mt-0.5 text-emerald-600 dark:text-emerald-400 select-none">Quran</span>
            </div>

            {/* 3. Terjemahan */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => { setActiveHeaderView("Terjemahan"); setMenuOpen(false); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeHeaderView === "Terjemahan" ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "neu-flat active:neu-pressed"
                }`}
              >
                <Image src="/icons/terjemahan.svg" alt="Terjemahan" width={20} height={20} className="w-5 h-5 opacity-80 dark:invert" />
              </button>
              <span className="text-[10px] font-sans font-medium mt-0.5 text-emerald-600 dark:text-emerald-400 select-none">Terjemahan</span>
            </div>

            {/* 4. Tajwid */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => { setActiveHeaderView("Tajwid"); setMenuOpen(false); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeHeaderView === "Tajwid" ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "neu-flat active:neu-pressed"
                }`}
              >
                <Image src="/icons/tajwid.svg" alt="Tajwid" width={20} height={20} className="w-5 h-5 opacity-80 dark:invert" />
              </button>
              <span className="text-[10px] font-sans font-medium mt-0.5 text-emerald-600 dark:text-emerald-400 select-none">Tajwid</span>
            </div>

            {/* 5. Waktu Solat */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => { setActiveHeaderView("Waktu Solat"); setMenuOpen(false); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeHeaderView === "Waktu Solat" ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "neu-flat active:neu-pressed"
                }`}
              >
                <Image src="/icons/waktu-solat.svg" alt="Solat" width={20} height={20} className="w-5 h-5 opacity-80 dark:invert" />
              </button>
              <span className="text-[10px] font-sans font-medium mt-0.5 text-emerald-600 dark:text-emerald-400 select-none">Solat</span>
            </div>

            {/* 6. Carian (Toggles SearchBox) */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  setMenuOpen(false);
                }}
                aria-label="Carian"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isSearchOpen ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "neu-flat active:neu-pressed text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <span className="text-[10px] font-sans font-medium mt-0.5 text-emerald-600 dark:text-emerald-400 select-none">Carian</span>
            </div>

            {/* 7. 3-Dot Options */}
            <div className="relative flex flex-col items-center" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Options Menu"
                className="w-10 h-10 rounded-full flex items-center justify-center neu-flat active:neu-pressed transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 opacity-80">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
              <span className="text-[10px] font-sans font-medium mt-0.5 text-transparent select-none">.</span>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-2xl neu-flat p-2 z-50 bg-white dark:bg-[#1e1e24] shadow-xl">
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

        {/* Global Floating Search Box with Tab Context */}
        <SearchBox
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          activeTab={activeHeaderView}
          chapters={chapters}
          onSelectSurahAndVerse={(_surahId, _verseKey) => {
            if (activeHeaderView !== "Quran" && activeHeaderView !== "Terjemahan") {
              setActiveHeaderView("Terjemahan");
            }
          }}
          onGeneralSearch={(query) => {
            console.log(`Searching in ${activeHeaderView}:`, query);
          }}
        />

        {/* Dynamic Content Display */}
        <div className="mt-2 flex-1 overflow-hidden">
          {renderTabContent()}
        </div>

      </div>

      {/* Global Floating Scroll-to-Top Button */}
      {isMounted && (
        <button
          onClick={scrollToTop}
          aria-label="Kembali ke atas"
          className={`fixed bottom-4 right-6 z-40 p-3.5 rounded-full neu-flat text-emerald-600 dark:text-emerald-400 shadow-xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
            showScrollTop
              ? "opacity-90 translate-y-0 pointer-events-auto scale-100"
              : "opacity-0 translate-y-4 pointer-events-none scale-95"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </main>
  );
}