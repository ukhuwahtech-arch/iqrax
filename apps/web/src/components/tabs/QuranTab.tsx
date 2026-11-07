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
  const [quickSearchInput, setQuickSearchInput] = useState<string>("");

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

    const surahNum = parseInt(verseKey?.split(":")[0] || "1");
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

    // Grab the start of the first word and end of the last word in this verse
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

    // Frame tracker to stop audio and clear highlight precisely when the verse ends
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

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(quickSearchInput.trim());
    if (!isNaN(p) && p >= 1 && p <= 604) setSelectedPage(p);
    setQuickSearchInput("");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative max-w-4xl mx-auto">
      {/* Control Header */}
      <div className="p-4 md:p-6 rounded-2xl neu-flat space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-xl font-bold">
            Al-Quran (Madinah Mushaf - Page {selectedPage} / 604)
          </h2>
          <button
            onClick={() => setSelectedPage(1)}
            title="Reset to Page 1"
            className="p-2.5 rounded-xl neu-flat text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
          >
            Reset
          </button>
        </div>

        <form onSubmit={handleQuickSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Jump to page (1 - 604)..."
            value={quickSearchInput}
            onChange={(e) => setQuickSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl neu-pressed text-xs font-semibold bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl neu-flat text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0"
          >
            Go
          </button>
        </form>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setSelectedPage((prev) => Math.max(prev - 1, 1))}
            disabled={selectedPage <= 1}
            className="px-4 py-2 rounded-xl neu-flat text-xs font-bold text-emerald-600 dark:text-emerald-400 disabled:opacity-40 cursor-pointer"
          >
            ← Previous Page
          </button>
          <span className="text-xs font-semibold opacity-75">
            Page {selectedPage} / 604
          </span>
          <button
            onClick={() => setSelectedPage((prev) => Math.min(prev + 1, 604))}
            disabled={selectedPage >= 604}
            className="px-4 py-2 rounded-xl neu-flat text-xs font-bold text-emerald-600 dark:text-emerald-400 disabled:opacity-40 cursor-pointer"
          >
            Next Page →
          </button>
        </div>
      </div>

      {/* Render MushafPage Component */}
      {loading || !pageData ? (
        <div className="p-12 rounded-2xl neu-pressed text-center text-sm opacity-75">
          Loading Quran physical pages...
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
    </div>
  );
};