// C:\Users\dxiau\iqrax\apps\web\src\components\tabs\SearchBox.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";

interface Chapter {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count?: number;
}

interface SearchBoxProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  chapters: Chapter[];
  onSelectSurahAndVerse: (surahId: number, verseKey: string) => void;
  onGeneralSearch?: (query: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  isOpen,
  onClose,
  activeTab,
  chapters,
  onSelectSurahAndVerse,
  onGeneralSearch,
}) => {
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedSurahId, setSelectedSurahId] = useState<number>(1);
  const [selectedVerseKey, setSelectedVerseKey] = useState<string>("all");
  const [versesCount, setVersesCount] = useState<number>(7);

  // Surah Dropdown states
  const [surahDropdownOpen, setSurahDropdownOpen] = useState<boolean>(false);
  const [surahSearchQuery, setSurahSearchQuery] = useState<string>("");
  const surahMenuRef = useRef<HTMLDivElement>(null);

  // Verse Dropdown states
  const [verseDropdownOpen, setVerseDropdownOpen] = useState<boolean>(false);
  const [verseSearchQuery, setVerseSearchQuery] = useState<string>("");
  const verseMenuRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentCh = chapters.find((ch) => ch.id === selectedSurahId);
    if (currentCh && currentCh.verses_count) {
      setVersesCount(currentCh.verses_count);
    } else {
      fetch(`https://api.quran.com/api/v4/chapters/${selectedSurahId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.chapter && data.chapter.verses_count) {
            setVersesCount(data.chapter.verses_count);
          }
        })
        .catch(() => setVersesCount(7));
    }
    setSelectedVerseKey("all");
    setVerseSearchQuery("");
  }, [selectedSurahId, chapters]);

  // Click outside closes the entire search box
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleResetAndClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setSearchInput("");
    setSelectedSurahId(1);
    setSelectedVerseKey("all");
    setSurahSearchQuery("");
    setVerseSearchQuery("");
    setSurahDropdownOpen(false);
    setVerseDropdownOpen(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = searchInput.trim();

    if (activeTab === "Terjemahan" || activeTab === "Quran") {
      if (!cleanInput) {
        onSelectSurahAndVerse(selectedSurahId, selectedVerseKey);
        onClose();
        return;
      }
      if (cleanInput.includes(":")) {
        const parts = cleanInput.split(":");
        const sId = parseInt(parts[0]?.trim() || "1", 10);
        const vNum = parts[1]?.trim() || "1";
        if (!isNaN(sId)) {
          onSelectSurahAndVerse(sId, `${sId}:${vNum}`);
          onClose();
        }
      } else {
        const sId = parseInt(cleanInput, 10);
        if (!isNaN(sId) && sId >= 1 && sId <= 114) {
          onSelectSurahAndVerse(sId, "all");
          onClose();
        }
      }
    } else {
      if (onGeneralSearch) onGeneralSearch(cleanInput);
      onClose();
    }
  };

  const filteredChapters = chapters.filter((ch) => {
    const q = surahSearchQuery.toLowerCase();
    return (
      ch.id.toString().includes(q) ||
      ch.name_simple.toLowerCase().includes(q)
    );
  });

  const allVerses = Array.from({ length: versesCount }, (_, i) => i + 1);
  const filteredVerses = allVerses.filter((vNum) => {
    const q = verseSearchQuery.toLowerCase();
    if (!q) return true;
    return vNum.toString().includes(q) || `ayat ${vNum}`.includes(q);
  });

  const currentSurah = chapters.find((ch) => ch.id === selectedSurahId);
  const currentAyatNum = selectedVerseKey === "all" ? "1" : selectedVerseKey.split(":")[1];
  const dynamicPlaceholder = `${selectedSurahId}:${currentAyatNum}`;

  return (
    <div 
      ref={containerRef} 
      className="absolute left-0 right-0 z-50 -mt-4 p-4 sm:p-6 rounded-2xl neu-flat space-y-2 shadow-2xl bg-white/95 dark:bg-[#1e1e24]/95 backdrop-blur-md transition-all duration-300 ease-out transform origin-top animate-fade-in font-poppins font-normal text-[14px]"
    >
      <style jsx>{`
        .emerald-icon {
          filter: brightness(0) saturate(100%) invert(42%) sepia(87%) saturate(614%) hue-rotate(120deg) brightness(93%) contrast(93%);
        }
      `}</style>

      <div className="flex justify-between items-center mb-1">
        <span className="text-emerald-600 dark:text-emerald-400 font-normal">Carian</span>
        <button 
          onClick={handleResetAndClose} 
          aria-label="Tutup"
          className="opacity-60 hover:opacity-100 cursor-pointer p-1 flex items-center justify-center w-6 h-6 rounded-lg neu-flat transition-opacity"
        >
          <img src="/icons/close.svg" alt="Tutup" className="w-3.5 h-3.5 emerald-icon" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Adjusted Grid Columns for Surah (wider), Ayat (matched), and Surah:Ayat */}
        {(activeTab === "Terjemahan" || activeTab === "Quran") ? (
          <div className="grid grid-cols-[1.25fr_0.85fr_1fr] gap-2">
            {/* 1. Surah Selector (Wider) */}
            <div className="space-y-1 relative min-w-0" ref={surahMenuRef}>
              <label className="opacity-70 font-normal">Surah</label>
              <button
                type="button"
                onClick={() => {
                  const willOpen = !surahDropdownOpen;
                  setSurahDropdownOpen(willOpen);
                  if (willOpen) {
                    setVerseDropdownOpen(false);
                    setSurahSearchQuery("");
                  }
                }}
                className="w-full px-2.5 py-2.5 rounded-xl neu-pressed font-normal flex items-center justify-between cursor-pointer min-w-0"
              >
                <span className="truncate">{currentSurah ? `${currentSurah.id}. ${currentSurah.name_simple}` : "Memuatkan..."}</span>
                <span className={`text-emerald-600 dark:text-emerald-400 shrink-0 ml-1 transition-transform duration-300 text-[12px] ${surahDropdownOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              {surahDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 sm:w-72 rounded-2xl neu-flat p-3 z-50 shadow-2xl bg-white dark:bg-[#1e1e24] space-y-2 transition-all duration-300 ease-out transform origin-top font-poppins font-normal text-[14px]">
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Cari surah..."
                      value={surahSearchQuery}
                      onChange={(e) => setSurahSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-2 pr-8 rounded-xl neu-pressed font-normal bg-transparent outline-none"
                    />
                    {surahSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSurahSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer flex items-center justify-center"
                      >
                        <img src="/icons/close.svg" alt="Padam" className="w-3.5 h-3.5 emerald-icon" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1 font-normal">
                    {filteredChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setSelectedSurahId(ch.id);
                          setSurahDropdownOpen(false);
                          onSelectSurahAndVerse(ch.id, "all");
                        }}
                        className={`w-full flex items-center justify-start px-3 py-2 font-normal rounded-xl transition-colors cursor-pointer ${
                          selectedSurahId === ch.id ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "hover:bg-black/5 opacity-80"
                        }`}
                      >
                        <span>{ch.id}. {ch.name_simple}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Verse Selector */}
            <div className="space-y-1 relative min-w-0" ref={verseMenuRef}>
              <label className="opacity-70 font-normal">Ayat</label>
              <button
                type="button"
                onClick={() => {
                  const willOpen = !verseDropdownOpen;
                  setVerseDropdownOpen(willOpen);
                  if (willOpen) {
                    setSurahDropdownOpen(false);
                    setVerseSearchQuery("");
                  }
                }}
                className="w-full px-2.5 py-2.5 rounded-xl neu-pressed font-normal flex items-center justify-between cursor-pointer min-w-0"
              >
                <span className="truncate">{selectedVerseKey === "all" ? `Semua (${versesCount})` : `Ayat ${selectedVerseKey.split(":")[1]}`}</span>
                <span className={`text-emerald-600 dark:text-emerald-400 shrink-0 ml-1 transition-transform duration-300 text-[12px] ${verseDropdownOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              {verseDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 sm:w-56 rounded-2xl neu-flat p-3 z-50 shadow-2xl bg-white dark:bg-[#1e1e24] space-y-2 transition-all duration-300 ease-out transform origin-top font-poppins font-normal text-[14px]">
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Cari ayat..."
                      value={verseSearchQuery}
                      onChange={(e) => setVerseSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-2 pr-8 rounded-xl neu-pressed font-normal bg-transparent outline-none"
                    />
                    {verseSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setVerseSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer flex items-center justify-center"
                      >
                        <img src="/icons/close.svg" alt="Padam" className="w-3.5 h-3.5 emerald-icon" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1 font-normal">
                    <button
                      onClick={() => {
                        setSelectedVerseKey("all");
                        setVerseDropdownOpen(false);
                        onSelectSurahAndVerse(selectedSurahId, "all");
                      }}
                      className="w-full text-left px-3 py-2 font-normal rounded-xl hover:bg-black/5 opacity-80"
                    >
                      Semua Ayat ({versesCount})
                    </button>
                    {filteredVerses.map((vNum) => (
                      <button
                        key={vNum}
                        onClick={() => {
                          setSelectedVerseKey(`${selectedSurahId}:${vNum}`);
                          setVerseDropdownOpen(false);
                          onSelectSurahAndVerse(selectedSurahId, `${selectedSurahId}:${vNum}`);
                        }}
                        className={`w-full text-left px-3 py-2 font-normal rounded-xl transition-colors cursor-pointer ${
                          selectedVerseKey === `${selectedSurahId}:${vNum}` ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "hover:bg-black/5 opacity-80"
                        }`}
                      >
                        Ayat {vNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Surah:Ayat Input with Dynamic Placeholder */}
            <div className="space-y-1 relative min-w-0">
              <label className="opacity-70 font-normal">Surah:Ayat</label>
              <div className="flex items-center gap-1 w-full">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder={dynamicPlaceholder}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full px-2 py-2.5 pr-6 rounded-xl neu-pressed font-normal bg-transparent outline-none truncate"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer flex items-center justify-center"
                    >
                      <img src="/icons/close.svg" alt="Padam" className="w-3.5 h-3.5 emerald-icon" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  aria-label="Cari"
                  className="p-2.5 rounded-xl neu-flat text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center w-8 h-10 shrink-0 font-normal"
                >
                  <img src="/icons/go.svg" alt="Cari" className="w-4 h-4 emerald-icon" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Full-width search bar for other tabs */
          <div className="flex flex-row items-center flex-nowrap gap-2 w-full font-normal">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder={`Cari dalam ${activeTab}...`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 pr-9 rounded-xl neu-pressed font-normal bg-transparent outline-none truncate"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer flex items-center justify-center"
                >
                  <img src="/icons/close.svg" alt="Padam" className="w-3.5 h-3.5 emerald-icon" />
                </button>
              )}
            </div>
            <button
              type="submit"
              aria-label="Cari"
              className="p-2.5 rounded-xl neu-flat text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center w-10 h-10 shrink-0 font-normal"
            >
              <img src="/icons/go.svg" alt="Cari" className="w-4 h-4 emerald-icon" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
};