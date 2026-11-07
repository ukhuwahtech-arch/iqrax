// C:\Users\dxiau\iqrax\apps\web\src\components\tabs\TerjemahanTab.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";

interface Chapter {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
}

interface VerseData {
  id: number;
  verse_key: string;
  verse_number: number;
  text_uthmani: string;
  translations?: {
    text: string;
  }[];
}

interface Segment {
  word_position: number;
  start_ms: number;
  end_ms: number;
}

interface VerseTimestamp {
  verse_key: string;
  segments: number[][];
}

export const TerjemahanTab: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<string>("all");
  const [verses, setVerses] = useState<VerseData[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);
  
  // Audio & Timestamp state for the entire chapter
  const [chapterAudioUrl, setChapterAudioUrl] = useState<string>("");
  const [chapterTimestamps, setChapterTimestamps] = useState<VerseTimestamp[]>([]);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentPlayingVerseRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // Quick Jump Input state (e.g., "8:2")
  const [quickSearchInput, setQuickSearchInput] = useState<string>("");

  // Searchable Surah dropdown states
  const [surahDropdownOpen, setSurahDropdownOpen] = useState<boolean>(false);
  const [surahSearchQuery, setSurahSearchQuery] = useState<string>("");
  const surahMenuRef = useRef<HTMLDivElement>(null);

  // Searchable Verse dropdown states
  const [verseDropdownOpen, setVerseDropdownOpen] = useState<boolean>(false);
  const [verseSearchQuery, setVerseSearchQuery] = useState<string>("");
  const verseMenuRef = useRef<HTMLDivElement>(null);

  // Scroll to Top visibility states
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize single global Audio instance on mount
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

  // Close dropdowns on outside click & handle scroll behavior for the floating button
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (surahMenuRef.current && !surahMenuRef.current.contains(event.target as Node)) {
        setSurahDropdownOpen(false);
      }
      if (verseMenuRef.current && !verseMenuRef.current.contains(event.target as Node)) {
        setVerseDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          setShowScrollTop(false);
        }, 2500);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // 1. Fetch Chapters for the Dropdown
  useEffect(() => {
    fetch("https://api.quran.com/api/v4/chapters?language=ms")
      .then((res) => res.json())
      .then((data) => {
        setChapters(data.chapters);
      })
      .catch((err) => {
        console.error("Failed to load chapters:", err);
      });
  }, []);

  // 2. Fetch ALL Verses and Chapter Audio Timings for the selected Surah
  useEffect(() => {
    setLoadingVerses(true);
    setSelectedVerse("all");
    setVerseSearchQuery("");

    // Completely stop and reset ongoing audio when switching surah
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    setActiveVerseKey(null);
    currentPlayingVerseRef.current = null;
    isInitializingRef.current = false;

    Promise.all([
      fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${selectedSurah}?language=ms&translations=39&fields=text_uthmani,verse_number&per_page=300`
      ).then((res) => res.json()),
      fetch(
        `https://api.quran.com/api/v4/chapter_recitations/7/${selectedSurah}?segments=true`
      ).then((res) => res.json())
    ])
      .then(([verseData, audioData]) => {
        setVerses(verseData.verses || []);

        const audioFile = audioData.audio_file;
        if (audioFile && audioFile.audio_url) {
          const fullUrl = audioFile.audio_url.startsWith("http")
            ? audioFile.audio_url
            : `https://verses.quran.com/${audioFile.audio_url}`;
          setChapterAudioUrl(fullUrl);
          setChapterTimestamps(audioFile.timestamps || []);
          
          if (audioRef.current) {
            audioRef.current.src = fullUrl;
            audioRef.current.load();
          }
        }

        setLoadingVerses(false);
      })
      .catch((err) => {
        console.error("Failed to load verses or audio data:", err);
        setLoadingVerses(false);
      });
  }, [selectedSurah]);

  // Audio Playback Handler locked strictly to the clicked verse
  const toggleVerseAudio = (verseKey: string) => {
    if (!audioRef.current || !chapterAudioUrl || isInitializingRef.current) return;

    // If currently playing this exact verse, toggle pause/stop
    if (isPlaying && currentPlayingVerseRef.current === verseKey) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActiveVerseKey(null);
      currentPlayingVerseRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    isInitializingRef.current = true;

    // Find timestamps for this specific verse
    const targetTimestamp = chapterTimestamps.find((t) => t.verse_key === verseKey);
    if (!targetTimestamp || !targetTimestamp.segments || targetTimestamp.segments.length === 0) {
      console.warn("No timing segments found for verse:", verseKey);
      isInitializingRef.current = false;
      return;
    }

    const segments: Segment[] = targetTimestamp.segments.map((seg) => ({
      word_position: seg[0] ?? 0,
      start_ms: seg[1] ?? 0,
      end_ms: seg[2] ?? 0,
    }));

    const startOffsetMs = segments[0]?.start_ms || 0;
    const endOffsetMs = segments[segments.length - 1]?.end_ms || 0;

    // Cleanly stop any existing animation frame loop
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

    // Strict frame tracker to cut off audio the exact millisecond the verse ends
    const trackTime = () => {
      if (!audioRef.current || audioRef.current.paused) return;

      const currentTimeMs = audioRef.current.currentTime * 1000;

      // Force pause as soon as current time reaches or exceeds this verse's end timestamp
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

  // Handle Quick Jump submission (e.g. "8:2" or "36")
  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = quickSearchInput.trim();
    if (!cleanInput) return;

    if (cleanInput.includes(":")) {
      const parts = cleanInput.split(":");
      const surahPart = parts[0]?.trim();
      const versePart = parts[1]?.trim();

      if (surahPart && versePart) {
        const sId = parseInt(surahPart);
        const vNum = versePart;

        if (!isNaN(sId) && sId >= 1 && sId <= 114) {
          setSelectedSurah(sId);
          const targetKey = `${sId}:${vNum}`;
          setSelectedVerse(targetKey);
        }
      }
    } else {
      const sId = parseInt(cleanInput);
      if (!isNaN(sId) && sId >= 1 && sId <= 114) {
        setSelectedSurah(sId);
        setSelectedVerse("all");
      }
    }
    setQuickSearchInput("");
  };

  // Reset to Default (Surah 1, All verses)
  const handleResetDefault = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setSelectedSurah(1);
    setSelectedVerse("all");
    setQuickSearchInput("");
    setSurahSearchQuery("");
    setVerseSearchQuery("");
    setIsPlaying(false);
    setActiveVerseKey(null);
    isInitializingRef.current = false;
  };

  // Smooth scroll back to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter chapters based on search query
  const filteredChapters = chapters.filter((ch) => {
    const query = surahSearchQuery.toLowerCase();
    return (
      ch.id.toString().includes(query) ||
      ch.name_simple.toLowerCase().includes(query) ||
      ch.name_arabic.toLowerCase().includes(query)
    );
  });

  // Filter verses based on search query
  const filteredVersesList = verses.filter((v) => {
    const query = verseSearchQuery.toLowerCase();
    return v.verse_number.toString().includes(query) || v.verse_key.toLowerCase().includes(query);
  });

  // Filter verses for display
  const filteredVerses = (() => {
    if (selectedVerse === "all") return verses;
    const startIndex = verses.findIndex((v) => v.verse_key === selectedVerse);
    return startIndex !== -1 ? verses.slice(startIndex) : verses;
  })();

  // Convert numbers to Arabic-Indic digits
  const toArabicNumber = (num: number) => {
    const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return num
      .toString()
      .split("")
      .map((digit) => arabicNumbers[parseInt(digit)])
      .join("");
  };

  // Helper to neutralize the un-renderable U+06DF black circle fallback on و۟ and ا۟
  const cleanUthmaniText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/و۟/g, "وْ")
      .replace(/ا۟/g, "اْ")
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
      .trim();
  };

  const currentSurah = chapters.find((ch) => ch.id === selectedSurah);
  const selectedVerseObj = verses.find((v) => v.verse_key === selectedVerse);

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Selection Header */}
      <div className="p-6 rounded-2xl neu-flat space-y-4">
        {/* Title & Reset Default Refresh Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Terjemahan Al-Quran</h2>
          <button
            onClick={handleResetDefault}
            title="Tetapkan Semula ke Lalai"
            className="p-2.5 rounded-xl neu-flat text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center"
          >
            {/* Refresh Icon SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Quick Jump Bar (e.g. type 8:2 or 36) */}
        <form onSubmit={handleQuickSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Cepat lompat (cth: 8:2 atau 36)..."
            value={quickSearchInput}
            onChange={(e) => setQuickSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl neu-pressed text-xs font-semibold bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl neu-flat text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
          >
            Lompat
          </button>
        </form>

        {/* Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          
          {/* Searchable Custom Neumorphic Surah Selector */}
          <div className="space-y-1 relative" ref={surahMenuRef}>
            <label className="text-xs font-semibold opacity-70">Pilih Surah</label>
            <button
              onClick={() => {
                setSurahDropdownOpen(!surahDropdownOpen);
                setSurahSearchQuery("");
              }}
              className="w-full px-4 py-2.5 rounded-xl neu-pressed text-xs font-semibold flex items-center justify-between cursor-pointer"
            >
              <span>
                {currentSurah
                  ? `${currentSurah.id}. ${currentSurah.name_simple}`
                  : "Memuatkan..."}
              </span>
              <span className="font-arabic text-sm text-emerald-600 dark:text-emerald-400">
                {currentSurah ? currentSurah.name_arabic : ""}
              </span>
            </button>

            {surahDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 rounded-2xl neu-flat p-3 z-50 shadow-2xl bg-white dark:bg-[#1e1e24] space-y-2">
                <input
                  type="text"
                  placeholder="Cari surah (cth: Al-Fatihah, 2)..."
                  value={surahSearchQuery}
                  onChange={(e) => setSurahSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl neu-pressed text-xs font-semibold bg-transparent outline-none"
                />

                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredChapters.length > 0 ? (
                    filteredChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setSelectedSurah(ch.id);
                          setSurahDropdownOpen(false);
                          setSurahSearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                          selectedSurah === ch.id
                            ? "neu-pressed text-emerald-600 dark:text-emerald-400"
                            : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
                        }`}
                      >
                        <span>{ch.id}. {ch.name_simple}</span>
                        <span className="font-arabic text-sm">{ch.name_arabic}</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs opacity-50">
                      Tiada surah dijumpai
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Searchable Custom Neumorphic Verse Selector */}
          <div className="space-y-1 relative" ref={verseMenuRef}>
            <label className="text-xs font-semibold opacity-70">Pilih Ayat</label>
            <button
              onClick={() => {
                setVerseDropdownOpen(!verseDropdownOpen);
                setVerseSearchQuery("");
              }}
              disabled={loadingVerses || verses.length === 0}
              className="w-full px-4 py-2.5 rounded-xl neu-pressed text-xs font-semibold flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span>
                {selectedVerse === "all"
                  ? `Semua Ayat (${verses.length})`
                  : `Ayat ${selectedVerseObj ? selectedVerseObj.verse_number : selectedVerse}`}
              </span>
              <span className="text-xs opacity-75">▼</span>
            </button>

            {verseDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 rounded-2xl neu-flat p-3 z-50 shadow-2xl bg-white dark:bg-[#1e1e24] space-y-2">
                <input
                  type="text"
                  placeholder="Cari ayat (cth: 21)..."
                  value={verseSearchQuery}
                  onChange={(e) => setVerseSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl neu-pressed text-xs font-semibold bg-transparent outline-none"
                />

                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  <button
                    onClick={() => {
                      setSelectedVerse("all");
                      setVerseDropdownOpen(false);
                      setVerseSearchQuery("");
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                      selectedVerse === "all"
                        ? "neu-pressed text-emerald-600 dark:text-emerald-400"
                        : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
                    }`}
                  >
                    Semua Ayat ({verses.length})
                  </button>

                  {filteredVersesList.length > 0 ? (
                    filteredVersesList.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVerse(v.verse_key);
                          setVerseDropdownOpen(false);
                          setVerseSearchQuery("");
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                          selectedVerse === v.verse_key
                            ? "neu-pressed text-emerald-600 dark:text-emerald-400"
                            : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
                        }`}
                      >
                        Ayat {v.verse_number}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs opacity-50">
                      Tiada ayat dijumpai
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Verses List Content */}
      {loadingVerses ? (
        <div className="p-8 rounded-2xl neu-pressed text-center text-sm opacity-75">
          Memuatkan ayat-ayat...
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVerses.map((verse) => {
            const isThisVerseActive = activeVerseKey === verse.verse_key && isPlaying;

            return (
              <div 
                key={verse.id} 
                className={`p-6 rounded-2xl transition-all space-y-4 ${
                  isThisVerseActive 
                    ? "neu-flat border-2 border-emerald-500/50 bg-emerald-500/[0.04] shadow-lg" 
                    : "neu-pressed"
                }`}
              >
                <div className="flex justify-between items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Ayat {verse.verse_key}</span>

                  <button
                    onClick={() => toggleVerseAudio(verse.verse_key)}
                    title={isThisVerseActive ? "Henti Audio" : "Dengar Sebutan"}
                    className={`p-2 rounded-xl neu-flat transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                      isThisVerseActive 
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-inner scale-105" 
                        : "hover:opacity-80"
                    }`}
                  >
                    {isThisVerseActive ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                    <span>{isThisVerseActive ? "Memainkan..." : "Dengar"}</span>
                  </button>
                </div>

                {/* Uthmani verse text using custom UthmanicScript font */}
                <div 
                  onClick={() => toggleVerseAudio(verse.verse_key)}
                  title="Tekan ayat untuk main/henti audio"
                  dir="rtl" 
                  className="text-right text-2xl md:text-3xl font-normal leading-[3.2rem] font-uthmanic cursor-pointer select-none rounded-xl p-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  style={{
                    fontFeatureSettings: '"rlig" 1, "calt" 1',
                    textRendering: 'optimizeLegibility',
                  }}
                >
                  <span 
                    className="font-medium transition-colors"
                    style={{
                      color: isThisVerseActive 
                        ? "#10b981" 
                        : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#ffffff' : '#111827')
                    }}
                  >
                    {cleanUthmaniText(verse.text_uthmani)}
                  </span>
                  
                  {/* Neumorphic button badge for clear verse numbering */}
                  <span 
                    className="inline-flex items-center justify-center w-12 h-12 mx-2.5 rounded-full neu-flat text-xl font-normal select-none align-middle font-uthmanic transition-colors"
                    style={{
                      color: isThisVerseActive 
                        ? "#10b981" 
                        : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#ffffff' : '#059669')
                    }}
                  >
                    {toArabicNumber(verse.verse_number)}
                  </span>
                </div>

                {/* Justified Malay Translation Text */}
                <p className="text-sm opacity-90 border-t border-black/5 dark:border-white/5 pt-3 leading-relaxed text-justify">
                  {verse.translations && verse.translations[0]
                    ? verse.translations[0].text.replace(/<[^>]*>?/gm, "")
                    : "Terjemahan tidak tersedia"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Scroll-to-Top Button */}
      <button
        onClick={scrollToTop}
        aria-label="Kembali ke atas"
        className={`fixed bottom-6 right-6 z-40 p-3.5 rounded-full neu-flat text-emerald-600 dark:text-emerald-400 shadow-xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
          showScrollTop
            ? "opacity-90 translate-y-0 pointer-events-auto hover:opacity-100 scale-100"
            : "opacity-0 translate-y-4 pointer-events-none scale-95"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
};