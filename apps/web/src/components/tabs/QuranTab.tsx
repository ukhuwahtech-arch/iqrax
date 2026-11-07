// C:\Users\dxiau\iqrax\apps\web\src\components\tabs\QuranTab.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import MushafPage from "../MushafPage";

interface VerseTimestamp {
  verse_key: string;
  segments: number[][];
}

export const QuranTab: React.FC = () => {
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Audio & Timestamp state for active chapter(s) on the current page
  const [chapterAudioUrl, setChapterAudioUrl] = useState<string>("");
  const [chapterTimestamps, setChapterTimestamps] = useState<VerseTimestamp[]>([]);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSurahAudioLoaded, setCurrentSurahAudioLoaded] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentPlayingVerseRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // Swipe gesture touch tracking refs
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);

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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Dynamic Font Injector mapping to public/fonts-woff2/ directory
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

  // Helper to fetch chapter audio and timestamps when a verse is clicked
  const ensureChapterAudioLoaded = async (surahNumber: number): Promise<boolean> => {
    if (currentSurahAudioLoaded === surahNumber && chapterAudioUrl) return true;

    try {
      const res = await fetch(`https://api.quran.com/api/v4/chapter_recitations/7/${surahNumber}?segments=true`);
      const audioData = await res.json();
      const audioFile = audioData.audio_file;

      if (audioFile && audioFile.audio_url) {
        const fullUrl = audioFile.audio_url.startsWith("http")
          ? audioFile.audio_url
          : `https://verses.quran.com/${audioFile.audio_url}`;
        
        setChapterAudioUrl(fullUrl);
        setChapterTimestamps(audioFile.timestamps || []);
        setCurrentSurahAudioLoaded(surahNumber);

        if (audioRef.current) {
          audioRef.current.src = fullUrl;
          audioRef.current.load();
        }
        return true;
      }
    } catch (err) {
      console.error("Failed to load chapter audio/timestamps:", err);
    }
    return false;
  };

  // Audio Playback Handler for whole-verse playback & highlighting
  const handleVerseClick = async (verseKey: string) => {
    if (!audioRef.current || isInitializingRef.current) return;

    if (isPlaying && currentPlayingVerseRef.current === verseKey) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActiveVerseKey(null);
      currentPlayingVerseRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const surahNum = parseInt(verseKey?.split(":")[0] || "1", 10);
    if (isNaN(surahNum)) return;

    isInitializingRef.current = true;
    const loaded = await ensureChapterAudioLoaded(surahNum);
    if (!loaded) {
      isInitializingRef.current = false;
      return;
    }

    const targetTimestamp = chapterTimestamps.find((t) => t.verse_key === verseKey);
    if (!targetTimestamp || !targetTimestamp.segments || targetTimestamp.segments.length === 0) {
      console.warn("No timing segments found for verse:", verseKey);
      isInitializingRef.current = false;
      return;
    }

    const startOffsetMs = targetTimestamp.segments[0]?.[1] || 0;
    const endOffsetMs = targetTimestamp.segments[targetTimestamp.segments.length - 1]?.[2] || 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    audioRef.current.pause();
    audioRef.current.currentTime = startOffsetMs / 1000;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setActiveVerseKey(verseKey);
        currentPlayingVerseRef.current = verseKey;
        isInitializingRef.current = false;
      })
      .catch((err) => {
        console.error("Audio playback error:", err);
        isInitializingRef.current = false;
      });

    const trackTime = () => {
      if (!audioRef.current || audioRef.current.paused) return;
      const currentTimeMs = audioRef.current.currentTime * 1000;

      if (endOffsetMs > 0 && currentTimeMs >= endOffsetMs) {
        audioRef.current.pause();
        audioRef.current.currentTime = endOffsetMs / 1000;
        setIsPlaying(false);
        setActiveVerseKey(null);
        currentPlayingVerseRef.current = null;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(trackTime);
    };

    animationFrameRef.current = requestAnimationFrame(trackTime);

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setActiveVerseKey(null);
      currentPlayingVerseRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  };

  // Touch and Swipe handlers
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
      setSelectedPage((prev) => Math.min(prev + 1, 604));
    } else if (distance < -minSwipeDistance) {
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

      {/* Compact Navigation Bar using the exact small circle design style */}
      <div className="mt-3 flex justify-center select-none gap-4 items-center">
        <button
          onClick={() => setSelectedPage((prev) => Math.max(prev - 1, 1))}
          disabled={selectedPage <= 1}
          aria-label="Halaman Sebelumnya"
          className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm disabled:opacity-30 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <img src="/icons/prev.svg" alt="Prev" className="w-3.5 h-3.5 emerald-icon" />
        </button>

        <div className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium text-amber-900/80 dark:text-amber-100/70 border border-amber-900/10 shadow-sm">
          {selectedPage}
        </div>

        <button
          onClick={() => setSelectedPage((prev) => Math.min(prev + 1, 604))}
          disabled={selectedPage >= 604}
          aria-label="Halaman Seterusnya"
          className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm disabled:opacity-30 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <img src="/icons/next.svg" alt="Next" className="w-3.5 h-3.5 emerald-icon" />
        </button>
      </div>
    </div>
  );
};