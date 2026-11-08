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
  onSelectSurahAndVerse: (surahId: number | "all", verseKey: string) => void;
  onGeneralSearch?: (query: string) => void;
  onResetSearch?: () => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  isOpen,
  onClose,
  activeTab,
  chapters,
  onSelectSurahAndVerse,
  onGeneralSearch,
  onResetSearch,
}) => {
  const [searchInput, setSearchInput] = useState<string>("");
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [selectedSurahId, setSelectedSurahId] = useState<number | "all">("all");
  const [selectedVerseKey, setSelectedVerseKey] = useState<string>("all");
  const [versesCount, setVersesCount] = useState<number>(286);

  // Surah Dropdown states
  const [surahDropdownOpen, setSurahDropdownOpen] = useState<boolean>(false);
  const [surahSearchQuery, setSurahSearchQuery] = useState<string>("");

  // Verse Dropdown states
  const [verseDropdownOpen, setVerseDropdownOpen] = useState<boolean>(false);
  const [verseSearchQuery, setVerseSearchQuery] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const initialScrollYRef = useRef<number>(0);
  const justOpenedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      justOpenedRef.current = true;
      const timer = setTimeout(() => {
        justOpenedRef.current = false;
      }, 300);
      return () => {
        clearTimeout(timer);
      };
    }
    return () => {};
  }, [isOpen]);

  useEffect(() => {
    if (typeof selectedSurahId === "number") {
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
    } else {
      setVersesCount(286);
    }
  }, [selectedSurahId, chapters]);

  // Record initial scroll position when opened & listen for scroll-down to collapse
  useEffect(() => {
    if (isOpen) {
      initialScrollYRef.current = window.scrollY;
    }

    const handleWindowScroll = () => {
      if (isOpen) {
        const scrollDelta = Math.abs(window.scrollY - initialScrollYRef.current);
        if (scrollDelta > 30) {
          onClose();
        }
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  }, [isOpen, onClose]);

  // Robust click outside handler for mobile & desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (justOpenedRef.current) return;

      if (containerRef.current) {
        if (!containerRef.current.contains(event.target as Node)) {
          onClose();
        } else {
          const target = event.target as HTMLElement;
          if (!target.closest(".dropdown-container")) {
            setSurahDropdownOpen(false);
            setVerseDropdownOpen(false);
          }
        }
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleReset = () => {
    setSearchInput("");
    setKeywordInput("");
    setSelectedSurahId("all");
    setSelectedVerseKey("all");
    setSurahSearchQuery("");
    setVerseSearchQuery("");
    setSurahDropdownOpen(false);
    setVerseDropdownOpen(false);
    if (onResetSearch) onResetSearch();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanKeyword = keywordInput.trim();
    if (cleanKeyword) {
      if (onGeneralSearch) {
        onGeneralSearch(cleanKeyword);
      } else {
        onSelectSurahAndVerse(selectedSurahId, selectedVerseKey);
      }
      onClose();
      return;
    }

    const cleanInput = searchInput.trim();
    if (!cleanInput) {
      onSelectSurahAndVerse(selectedSurahId, selectedVerseKey);
      onClose();
      return;
    }

    if (activeTab === "Terjemahan" || activeTab === "Quran") {
      if (cleanInput.includes(":")) {
        const parts = cleanInput.split(":");
        const sId = parseInt(parts[0]?.trim() || "1", 10);
        const vNum = parts[1]?.trim() || "1";
        if (!isNaN(sId) && sId >= 1 && sId <= 114) {
          setSelectedSurahId(sId);
          setSelectedVerseKey(`${sId}:${vNum}`);
          onSelectSurahAndVerse(sId, `${sId}:${vNum}`);
          onClose();
        }
      } else {
        const sId = parseInt(cleanInput, 10);
        if (!isNaN(sId) && sId >= 1 && sId <= 114) {
          setSelectedSurahId(sId);
          setSelectedVerseKey("all");
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

  const currentSurah = typeof selectedSurahId === "number" ? chapters.find((ch) => ch.id === selectedSurahId) : null;
  const currentAyatNum = selectedVerseKey === "all" ? "1" : selectedVerseKey.split(":")[1];
  const dynamicPlaceholder = typeof selectedSurahId === "number" ? `${selectedSurahId}:${currentAyatNum}` : `1:${currentAyatNum}`;

  return (
    <div 
      ref={containerRef} 
      className="absolute left-0 right-0 z-50 mt-[23px] p-4 sm:p-6 rounded-2xl neu-flat space-y-3 shadow-2xl bg-white/95 dark:bg-[#1e1e24]/95 backdrop-blur-md transition-all duration-300 ease-out transform origin-top animate-fade-in font-poppins font-normal text-[14px]"
    >
      <style jsx>{`
        .emerald-icon {
          filter: brightness(0) saturate(100%) invert(42%) sepia(87%) saturate(614%) hue-rotate(120deg) brightness(93%) contrast(93%);
        }
      `}</style>

      <div className="flex justify-between items-center mb-1">
        <span className="text-emerald-600 dark:text-emerald-400 font-normal">Carian</span>
        <button 
          type="button"
          onClick={handleReset} 
          aria-label="Set Semula"
          title="Set semula carian"
          className="opacity-60 hover:opacity-100 cursor-pointer p-1 flex items-center justify-center w-6 h-6 rounded-lg neu-flat transition-opacity"
        >
          <img src="/icons/close.svg" alt="Set Semula" className="w-3.5 h-3.5 emerald-icon" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {(activeTab === "Terjemahan" || activeTab === "Quran") ? (
          <>
            <div className="grid grid-cols-[1.4fr_0.7fr_0.95fr] gap-2">
              {/* 1. Surah Selector */}
              <div className="space-y-1 relative min-w-0 dropdown-container">
                <label className="opacity-70 font-normal">Surah</label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const willOpen = !surahDropdownOpen;
                    setSurahDropdownOpen(willOpen);
                    if (willOpen) {
                      setVerseDropdownOpen(false);
                      setSurahSearchQuery("");
                    }
                  }}
                  className="w-full px-2.5 py-2.5 rounded-xl neu-pressed font-normal flex items-center justify-between cursor-pointer min-w-0"
                >
                  <span className="truncate">
                    {selectedSurahId === "all" ? "Semua" : currentSurah ? `${currentSurah.id}. ${currentSurah.name_simple}` : "Memuatkan..."}
                  </span>
                  <span className={`text-emerald-600 dark:text-emerald-400 shrink-0 ml-1 transition-transform duration-300 text-[12px] ${surahDropdownOpen ? "rotate-180" : ""}`}>▼</span>
                </button>

                {surahDropdownOpen && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 mt-2 w-64 sm:w-72 rounded-2xl neu-flat p-3 z-50 shadow-2xl bg-white dark:bg-[#1e1e24] space-y-2 transition-all duration-300 ease-out transform origin-top font-poppins font-normal text-[14px]"
                  >
                    <div className="relative w-full">
                      <input
                        type="text"
                        placeholder="Cari surah..."
                        value={surahSearchQuery}
                        onChange={(e) => setSurahSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full px-3 py-2 pr-8 rounded-xl neu-pressed font-normal bg-transparent outline-none text-[16px] sm:text-[14px]"
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
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSurahId("all");
                          setSelectedVerseKey("all");
                          setSurahDropdownOpen(false);
                          onSelectSurahAndVerse("all", "all");
                        }}
                        className={`w-full flex items-center justify-start px-3 py-2 font-normal rounded-xl transition-colors cursor-pointer ${
                          selectedSurahId === "all" ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "hover:bg-black/5 opacity-80"
                        }`}
                      >
                        <span>Semua</span>
                      </button>

                      {filteredChapters.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setSelectedSurahId(ch.id);
                            setSelectedVerseKey("all");
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
              <div className="space-y-1 relative min-w-0 dropdown-container">
                <label className="opacity-70 font-normal">Ayat</label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const willOpen = !verseDropdownOpen;
                    setVerseDropdownOpen(willOpen);
                    if (willOpen) {
                      setSurahDropdownOpen(false);
                      setVerseSearchQuery("");
                    }
                  }}
                  className="w-full px-2 py-2.5 rounded-xl neu-pressed font-normal flex items-center justify-between cursor-pointer min-w-0"
                >
                  <span className="truncate">{selectedVerseKey === "all" ? "Semua" : `Ayat ${selectedVerseKey.split(":")[1]}`}</span>
                  <span className={`text-emerald-600 dark:text-emerald-400 shrink-0 ml-1 transition-transform duration-300 text-[12px] ${verseDropdownOpen ? "rotate-180" : ""}`}>▼</span>
                </button>

                {verseDropdownOpen && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 mt-2 w-48 sm:w-56 rounded-2xl neu-flat p-3 z-50 shadow-2xl bg-white dark:bg-[#1e1e24] space-y-2 transition-all duration-300 ease-out transform origin-top font-poppins font-normal text-[14px]"
                  >
                    <div className="relative w-full">
                      <input
                        type="text"
                        placeholder="Cari ayat..."
                        value={verseSearchQuery}
                        onChange={(e) => setVerseSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full px-3 py-2 pr-8 rounded-xl neu-pressed font-normal bg-transparent outline-none text-[16px] sm:text-[14px]"
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
                        type="button"
                        onClick={() => {
                          setSelectedVerseKey("all");
                          setVerseDropdownOpen(false);
                          onSelectSurahAndVerse(selectedSurahId, "all");
                        }}
                        className="w-full text-left px-3 py-2 font-normal rounded-xl hover:bg-black/5 opacity-80"
                      >
                        Semua Ayat
                      </button>
                      {filteredVerses.map((vNum) => (
                        <button
                          key={vNum}
                          type="button"
                          onClick={() => {
                            const sId = selectedSurahId === "all" ? 1 : selectedSurahId;
                            const vKey = `${sId}:${vNum}`;
                            setSelectedVerseKey(vKey);
                            setVerseDropdownOpen(false);
                            onSelectSurahAndVerse(selectedSurahId, vKey);
                          }}
                          className={`w-full text-left px-3 py-2 font-normal rounded-xl transition-colors cursor-pointer ${
                            selectedVerseKey.endsWith(`:${vNum}`) ? "neu-pressed text-emerald-600 dark:text-emerald-400" : "hover:bg-black/5 opacity-80"
                          }`}
                        >
                          Ayat {vNum}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Surah:Ayat Input */}
              <div className="space-y-1 relative min-w-0">
                <label className="opacity-70 font-normal">Surah:Ayat</label>
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder={dynamicPlaceholder}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full px-2.5 py-2.5 pr-6 rounded-xl neu-pressed font-normal bg-transparent outline-none truncate text-[16px] sm:text-[14px]"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer flex items-center justify-center"
                    >
                      <img src="/icons/close.svg" alt="Padam" className="w-3 h-3 emerald-icon" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Full-width Perkataan Input */}
            <div className="space-y-1 relative w-full">
              <label className="opacity-70 font-normal">Perkataan / Kata Kunci</label>
              <div className="flex items-center gap-1 w-full">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Cari perkataan atau ayat..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    className="w-full px-3 py-2.5 pr-8 rounded-xl neu-pressed font-normal bg-transparent outline-none truncate text-[16px] sm:text-[14px]"
                  />
                  {keywordInput && (
                    <button
                      type="button"
                      onClick={() => setKeywordInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer flex items-center justify-center"
                    >
                      <img src="/icons/close.svg" alt="Padam" className="w-3.5 h-3.5 emerald-icon" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  aria-label="Cari Perkataan"
                  className="p-2.5 rounded-xl neu-flat text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center w-10 h-10 shrink-0 font-normal"
                >
                  <img src="/icons/go.svg" alt="Cari" className="w-4 h-4 emerald-icon" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-row items-center flex-nowrap gap-2 w-full font-normal">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder={`Cari dalam ${activeTab}...`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 pr-9 rounded-xl neu-pressed font-normal bg-transparent outline-none truncate text-[16px] sm:text-[14px]"
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