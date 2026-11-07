"use client";

import React, { useEffect, useState, useRef } from "react";

interface WordData {
  id: number;
  position: number;
  text_uthmani: string;
  char_type_name?: string;
}

interface Segment {
  word_position: number;
  start_ms: number;
  end_ms: number;
}

export const IqraxTab: React.FC = () => {
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [verseWords, setVerseWords] = useState<WordData[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeWordPosition, setActiveWordPosition] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const [searchInput, setSearchInput] = useState<string>("3:4");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Helper to neutralize the un-renderable U+06DF black circle fallback on و۟ and ا۟
  const cleanUthmaniText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/و۟/g, "وْ")
      .replace(/ا۟/g, "اْ")
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
      .trim();
  };

  const fetchAndInspectVerse = async (verseKeyToFetch: string) => {
    const cleanKey = verseKeyToFetch.trim();
    const parts = cleanKey.split(":");
    const surahNum = parts[0];
    const verseNum = parts[1] || "1";

    if (!surahNum || isNaN(Number(surahNum))) {
      setDebugLog((prev) => [`Invalid format. Use Surah:Ayat (e.g., 3:4)`, ...prev]);
      return;
    }

    setLoading(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveWordPosition(null);
    setIsPlaying(false);

    try {
      // 1. Fetch verse text and words for the specific chapter
      const verseRes = await fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?language=ms&fields=text_uthmani,verse_number&words=true&word_fields=text_uthmani,char_type_name&per_page=300`
      );
      const verseData = await verseRes.json();
      const found = verseData.verses?.find(
        (v: any) => v.verse_key === `${surahNum}:${verseNum}`
      );

      if (!found) {
        setDebugLog([`Verse ${cleanKey} not found in Chapter ${surahNum}.`]);
        setLoading(false);
        return;
      }

      const original = found.text_uthmani;
      setRawText(original);

      const rawWords: WordData[] = found.words || [];
      const renderableWords = rawWords
        .filter((w) => w.char_type_name === "word")
        .sort((a, b) => a.position - b.position);

      setVerseWords(renderableWords);

      // 2. Fetch Chapter Audio with word-level segments enabled (Reciter 7 = Mishary Rashid Alafasy)
      const audioRes = await fetch(
        `https://api.quran.com/api/v4/chapter_recitations/7/${surahNum}?segments=true`
      );
      
      const contentType = audioRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API returned non-JSON response.");
      }

      const audioData = await audioRes.json();
      const audioFile = audioData.audio_file;

      if (!audioFile || !audioFile.audio_url) {
        throw new Error("Chapter audio URL not available.");
      }

      const fullAudioUrl = audioFile.audio_url.startsWith("http")
        ? audioFile.audio_url
        : `https://verses.quran.com/${audioFile.audio_url}`;

      // 3. Extract the timestamp object matching our exact verse key
      const chapterTimestamps = audioFile.timestamps || [];
      const targetVerseTimestamp = chapterTimestamps.find(
        (t: any) => t.verse_key === `${surahNum}:${verseNum}`
      );

      const rawSegments: number[][] = targetVerseTimestamp?.segments || [];
      const formattedSegments: Segment[] = rawSegments.map((seg) => ({
        word_position: seg[0] ?? 0,
        start_ms: seg[1] ?? 0,
        end_ms: seg[2] ?? 0,
      }));

      setSegments(formattedSegments);
      audioRef.current = new Audio(fullAudioUrl);

      // Build Inspector & Mapping Log
      const logs: string[] = [];
      logs.push(`=== CHAPTER AUDIO TIMING INSPECTION: VERSE ${found.verse_key} ===`);
      logs.push(`Audio URL: ${fullAudioUrl}`);
      logs.push(`Total Renderable Words: ${renderableWords.length}`);
      logs.push(`Total Timing Segments Loaded: ${formattedSegments.length}`);
      logs.push("--------------------------------------------------------------------------------");
      logs.push(`${"Pos".padEnd(4)} | ${"Arabic Word".padEnd(15)} | ${"Start (ms)".padEnd(10)} | ${"End (ms)"}`);
      logs.push("--------------------------------------------------------------------------------");

      renderableWords.forEach((w) => {
        const seg = formattedSegments.find((s) => s.word_position === w.position);
        logs.push(
          `${String(w.position).padEnd(4)} | ${String(w.text_uthmani).padEnd(15)} | ${String(seg?.start_ms ?? "N/A").padEnd(10)} | ${seg?.end_ms ?? "N/A"}`
        );
      });
      logs.push("--------------------------------------------------------------------------------");

      setDebugLog(logs);
    } catch (err: any) {
      console.error("Error loading chapter audio data:", err);
      setDebugLog([`Error: ${err.message}`, `Tip: Try another verse or check network connection.`]);
      setSegments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndInspectVerse("3:4");
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchAndInspectVerse(searchInput.trim());
    }
  };

  // Play audio clamped specifically to this verse's start and end timestamps
  const playVerseAudio = () => {
    if (!audioRef.current || segments.length === 0) return;

    if (isPlaying && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActiveWordPosition(null);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const startOffsetMs = segments[0]?.start_ms || 0;
    const endOffsetMs = segments[segments.length - 1]?.end_ms || 0;

    audioRef.current.currentTime = startOffsetMs / 1000;
    audioRef.current.play().catch((err) => console.error("Playback error:", err));
    setIsPlaying(true);

    const trackTime = () => {
      if (!audioRef.current || audioRef.current.paused) return;

      const currentTimeMs = audioRef.current.currentTime * 1000;

      // Automatically stop playback when the verse ends
      if (endOffsetMs > 0 && currentTimeMs >= endOffsetMs) {
        audioRef.current.pause();
        setIsPlaying(false);
        setActiveWordPosition(null);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        return;
      }

      // Match current millisecond time against segment ranges
      const currentSegment = segments.find(
        (seg) => currentTimeMs >= seg.start_ms && currentTimeMs <= seg.end_ms
      );

      if (currentSegment) {
        setActiveWordPosition(currentSegment.word_position);
      } else {
        setActiveWordPosition(null);
      }

      animationFrameRef.current = requestAnimationFrame(trackTime);
    };

    animationFrameRef.current = requestAnimationFrame(trackTime);

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setActiveWordPosition(null);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  };

  // Copy logs to clipboard
  const handleCopyLogs = () => {
    const textToCopy = debugLog.join("\n");
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-2">
      <div className="p-6 rounded-2xl neu-flat space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Iqrax Debug Inspector & Chapter Audio Sync</h2>
          <div className="flex items-center gap-2 text-xs font-semibold opacity-70">
            <span>{getStatusIndicator(isPlaying)}</span>
          </div>
        </div>
        <p className="text-sm opacity-80 leading-relaxed">
          Type any Surah and Ayat number (e.g., <code className="font-mono text-emerald-600 dark:text-emerald-400">3:4</code> or <code className="font-mono text-emerald-600 dark:text-emerald-400">18:2</code>). <strong className="text-emerald-600 dark:text-emerald-400">Click directly on the verse text below</strong> to play or pause audio with real-time word highlighting!
        </p>

        {/* Quick Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Cari ayat (cth: 3:4 atau 18:2)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl neu-pressed text-xs font-semibold bg-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl neu-flat text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer shrink-0 disabled:opacity-50"
          >
            {loading ? "Memuatkan..." : "Periksa"}
          </button>
        </form>

        {/* BEFORE BOX (Original Raw String) */}
        <div className="space-y-1 pt-2">
          <label className="text-xs font-semibold opacity-70">
            BEFORE (Original Raw API Text - Black circle artifact present):
          </label>
          <div 
            className="p-4 rounded-xl neu-pressed text-right text-2xl md:text-3xl font-bold font-arabic leading-[3.2rem] text-gray-800 dark:text-gray-100" 
            dir="rtl"
            style={{
              fontFeatureSettings: '"rlig" 1, "calt" 1',
              textRendering: 'optimizeLegibility',
            }}
          >
            {loading ? "Memuatkan..." : rawText}
          </div>
        </div>

        {/* AFTER BOX (Clickable Verse Text for Audio Playback) */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              AFTER (Click verse text to play/pause audio sync):
            </label>
            <span className="text-[11px] font-semibold opacity-60">
              {isPlaying ? "▶ Sedang dimainkan..." : "👆 Tekan ayat untuk dengar"}
            </span>
          </div>
          <div 
            onClick={playVerseAudio}
            title={segments.length > 0 ? "Tekan untuk mainkan/hentikan ayat" : "Sedang memuatkan..."}
            className={`p-5 rounded-xl neu-flat text-right text-2xl md:text-3xl font-bold font-arabic leading-[3.8rem] text-gray-800 dark:text-gray-100 flex flex-wrap gap-x-2 gap-y-1 items-center justify-end transition-all select-none ${
              segments.length > 0 ? "cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]" : "cursor-default opacity-70"
            }`}
            dir="rtl"
            style={{
              fontFeatureSettings: '"rlig" 1, "calt" 1',
              textRendering: 'optimizeLegibility',
            }}
          >
            {loading ? (
              <div className="w-full text-center text-lg font-sans">Memuatkan ayat & audio...</div>
            ) : verseWords.length > 0 ? (
              verseWords.map((word) => {
                const isHighlighted = activeWordPosition === word.position;
                const sanitizedWordText = cleanUthmaniText(word.text_uthmani);
                if (!sanitizedWordText) return null;

                return (
                  <span
                    key={word.id}
                    className={`transition-all px-1.5 rounded-lg ${
                      isHighlighted 
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/25 scale-105 shadow-md" 
                        : "text-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {sanitizedWordText}
                  </span>
                );
              })
            ) : (
              <div className="w-full text-center text-lg font-sans">Tiada data perkataan</div>
            )}
          </div>
        </div>
      </div>

      {/* Console output display box with Copy Icon */}
      <div className="p-6 rounded-2xl neu-flat space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold opacity-95">Timing Mapping & Console Log Output:</h3>
          <button
            onClick={handleCopyLogs}
            title="Salin log"
            className="p-2 rounded-xl neu-flat text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            {copied ? (
              <>
                <span>Disalin!</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Salin</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </>
            )}
          </button>
        </div>
        <div className="p-4 rounded-xl neu-pressed max-h-80 overflow-y-auto font-mono text-[11px] space-y-1 bg-black/5 dark:bg-white/5 whitespace-pre">
          {debugLog.length > 0 ? (
            debugLog.map((line, i) => <div key={i}>{line}</div>)
          ) : (
            <div>Loading timing inspection...</div>
          )}
        </div>
      </div>
    </div>
  );
};

function getStatusIndicator(isPlaying: boolean) {
  return isPlaying ? "🟢 Audio Aktif" : "⚪ Sedia";
}