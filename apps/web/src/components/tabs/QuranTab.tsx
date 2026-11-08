// C:\Users\dxiau\iqrax\apps\web\src\components\tabs\QuranTab.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import MushafPage from "../MushafPage";

interface QuranTabProps {
  selectedSurah?: number | "all";
  selectedVerse?: string;
  keyword?: string;
}

export const QuranTab: React.FC<QuranTabProps> = ({
  selectedSurah = 1,
  selectedVerse = "all",
  keyword: _keyword = "",
}) => {
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Audio state for active verse playback
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayingVerseRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // Swipe gesture touch tracking refs
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);

  // Helper to determine Juzuk number (1 to 30) based on Madani Mushaf page number (1 to 604)
  const getJuzukNumber = (page: number): number => {
    if (page <= 21) return 1;
    const juzuk = Math.floor((page - 22) / 20) + 2;
    return Math.min(juzuk, 30);
  };

  // Map Surah / Verse selection to Quran page index if updated from Search Box
  useEffect(() => {
    if (selectedSurah && selectedSurah !== "all") {
      const chapterPages: Record<number, number> = {
        1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
      };
      const targetPage = chapterPages[selectedSurah as number] || 1;
      setSelectedPage(targetPage);
    }
  }, [selectedSurah, selectedVerse]);

  // Initialize global Audio instance on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Dynamic Font Injector mapping for Mushaf page font
  useEffect(() => {
    const paddedPage = String(selectedPage).padStart(3, '0');
    const fontName = `QCF4_Hafs_${paddedPage}`;
    const fontPath = `/fonts-woff2/QCF4_Hafs_${paddedPage}_W.woff2`;

    let styleEl = document.getElementById("mushaf-dynamic-font") as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "mushaf-dynamic-font";
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontPath}') format('woff2');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }
    `;
  }, [selectedPage]);

  // Fetch page JSON dynamically on-demand from public folder & reset audio on page change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setActiveVerseKey(null);
    currentPlayingVerseRef.current = null;

    async function loadPage() {
      try {
        const paddedPage = String(selectedPage).padStart(3, '0');
        const res = await fetch(`/data/quran-pages/${paddedPage}.json`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch page ${selectedPage}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        if (isMounted) {
          const paddedPageStr = String(selectedPage).padStart(3, '0');
          setPageData({
            ...data,
            font: `QCF4_Hafs_${paddedPageStr}`
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load JSON for page", selectedPage, err);
        if (isMounted) setLoading(false);
      }
    }

    loadPage();
    return () => {
      isMounted = false;
    };
  }, [selectedPage]);

  // Reliable Direct Single-Verse Audio Playback Handler
  const handleVerseClick = async (verseKey: string) => {
    if (!audioRef.current || isInitializingRef.current) return;

    if (isPlaying && currentPlayingVerseRef.current === verseKey) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActiveVerseKey(null);
      currentPlayingVerseRef.current = null;
      return;
    }

    const [surahStr, verseStr] = verseKey.split(":");
    const surahNum = parseInt(surahStr || "1", 10);
    const verseNum = parseInt(verseStr || "1", 10);
    if (isNaN(surahNum) || isNaN(verseNum)) return;

    isInitializingRef.current = true;
    audioRef.current.pause();

    try {
      // Format zero-padded numbers for direct Quran.com verse audio URL structure (e.g. 001001.mp3)
      const paddedSurah = String(surahNum).padStart(3, '0');
      const paddedVerse = String(verseNum).padStart(3, '0');
      const directAudioUrl = `https://verses.quran.com/Alafasy/mp3/${paddedSurah}${paddedVerse}.mp3`;

      audioRef.current.src = directAudioUrl;
      audioRef.current.load();

      await audioRef.current.play();
      setIsPlaying(true);
      setActiveVerseKey(verseKey);
      currentPlayingVerseRef.current = verseKey;

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setActiveVerseKey(null);
        currentPlayingVerseRef.current = null;
      };
    } catch (err) {
      console.error("Failed to play verse audio:", err);
    } finally {
      isInitializingRef.current = false;
    }
  };

  // RTL Touch and Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0]?.clientX || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0]?.clientX || 0;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Arabic next page
      setSelectedPage((prev) => Math.min(prev + 1, 604));
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Arabic previous page
      setSelectedPage((prev) => Math.max(prev - 1, 1));
    }

    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  return (
    <div 
      className="space-y-4 animate-fade-in pb-12 relative max-w-4xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style jsx>{`
        .emerald-icon {
          filter: brightness(0) saturate(100%) invert(42%) sepia(87%) saturate(614%) hue-rotate(120deg) brightness(93%) contrast(93%);
        }
      `}</style>

      {/* Render MushafPage Component */}
      {loading || !pageData ? (
        <div className="p-12 rounded-2xl neu-pressed text-center text-sm opacity-75">
          Memuatkan halaman Mushaf...
        </div>
      ) : (
        <div className="flex justify-center items-center">
          <MushafPage 
            pageData={pageData} 
            activeVerseKey={activeVerseKey}
            isPlaying={isPlaying}
            onVerseClick={handleVerseClick}
          />
        </div>
      )}

      {/* Navigation Bar with Juzuk on far left edge and centered page controls */}
      <div className="-mt-[13px] relative flex items-center justify-between select-none max-w-4xl mx-auto px-2">
        {/* Juzuk Display on the left edge */}
        <div className="neu-flat px-3 h-8 rounded-xl flex items-center justify-center text-xs font-sans font-medium text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm shrink-0">
          Juzuk {getJuzukNumber(selectedPage)}
        </div>

        {/* Centered Page Navigation Controls (prev.svg on left, next.svg on right) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
          {/* Left Button (Uses prev.svg) */}
          <button
            onClick={() => setSelectedPage((prev) => Math.min(prev + 1, 604))}
            disabled={selectedPage >= 604}
            aria-label="Halaman Seterusnya"
            className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm disabled:opacity-30 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <img src="/icons/prev.svg" alt="Next" className="w-3.5 h-3.5 emerald-icon" />
          </button>

          <span className="text-sm font-sans font-semibold text-emerald-600 dark:text-emerald-400 px-1 select-none">
            {selectedPage}
          </span>

          {/* Right Button (Uses next.svg) */}
          <button
            onClick={() => setSelectedPage((prev) => Math.max(prev - 1, 1))}
            disabled={selectedPage <= 1}
            aria-label="Halaman Sebelumnya"
            className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm disabled:opacity-30 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <img src="/icons/next.svg" alt="Prev" className="w-3.5 h-3.5 emerald-icon" />
          </button>
        </div>

        {/* Spacer to balance flex layout */}
        <div className="w-[72px] shrink-0" />
      </div>
    </div>
  );
};