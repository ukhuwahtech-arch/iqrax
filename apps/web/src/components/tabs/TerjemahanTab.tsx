// C:\Users\dxiau\iqrax\apps\web\src\components\tabs\TerjemahanTab.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";

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
  const [selectedSurah] = useState<number>(1);
  const [selectedVerse] = useState<string>("all");
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

  // Fetch ALL Verses and Chapter Audio Timings for the selected Surah
  useEffect(() => {
    setLoadingVerses(true);

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

    if (isPlaying && currentPlayingVerseRef.current === verseKey) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActiveVerseKey(null);
      currentPlayingVerseRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    isInitializingRef.current = true;

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
      .map((digit) => arabicNumbers[parseInt(digit, 10)])
      .join("");
  };

  const cleanUthmaniText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/و۟/g, "وْ")
      .replace(/ا۟/g, "اْ")
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
      .trim();
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 relative">
      <style jsx>{`
        .emerald-icon {
          filter: brightness(0) saturate(100%) invert(42%) sepia(87%) saturate(614%) hue-rotate(120deg) brightness(93%) contrast(93%);
        }
      `}</style>

      {/* Verses List Content */}
      {loadingVerses ? (
        <div className="p-8 rounded-2xl neu-pressed text-center text-sm opacity-75">
          Memuatkan ayat-ayat...
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVerses.map((verse) => {
            const isThisVerseActive = activeVerseKey === verse.verse_key && isPlaying;

            return (
              <div 
                key={verse.id} 
                className={`p-4 rounded-2xl transition-all space-y-1 ${
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
                    className={`py-1.5 px-3 rounded-xl neu-flat transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                      isThisVerseActive 
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-inner scale-105" 
                        : "hover:opacity-80"
                    }`}
                  >
                    {isThisVerseActive ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                    <span>{isThisVerseActive ? "Memainkan..." : "Dengar"}</span>
                  </button>
                </div>

                {/* Uthmani verse text using custom UthmanicScript font (Non-clickable for audio) */}
                <div 
                  dir="rtl" 
                  className="text-right text-2xl md:text-3xl font-normal leading-[3.2rem] font-uthmanic select-none rounded-xl p-1 transition-colors"
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
                    className="inline-flex items-center justify-center w-11 h-11 mx-2 rounded-full neu-flat text-lg font-normal select-none align-middle font-uthmanic transition-colors"
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
                <p className="text-sm opacity-90 border-t border-black/5 dark:border-white/5 pt-1.5 leading-relaxed text-justify">
                  {verse.translations && verse.translations[0]
                    ? verse.translations[0].text.replace(/<[^>]*>?/gm, "")
                    : "Terjemahan tidak tersedia"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};