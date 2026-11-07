// C:\Users\dxiau\iqrax\apps\web\src\components\MushafPage.tsx
'use client';

import React from 'react';

interface WordItem {
  code: number;
  char: string;
  font?: string;
  text: string;
  type: string;
  verse_key?: string;
  position?: number;
}

interface MushafLine {
  line: number;
  words: WordItem[];
}

interface MushafPageProps {
  pageData: {
    page: number;
    font: string;
    surahs?: any[];
    lines: MushafLine[];
  };
  activeVerseKey?: string | null;
  isPlaying?: boolean;
  onVerseClick?: (verseKey: string) => void;
}

export default function MushafPage({
  pageData,
  activeVerseKey,
  isPlaying,
  onVerseClick,
}: MushafPageProps) {
  const isPageOneOrTwo = pageData.page === 1 || pageData.page === 2;
  const isPage602 = pageData.page === 602;
  const isPages603to604 = pageData.page >= 603 && pageData.page <= 604;
  const isShortPage = isPageOneOrTwo || isPage602;

  return (
    <div className="w-full max-w-[96vw] sm:max-w-[720px] mx-auto my-2 flex flex-col items-center">
      {/* Mushaf Container */}
      <div 
        className={`relative w-full bg-[#fbf9f3] dark:bg-[#151518] neu-pressed @container select-text mushaf-layout overflow-hidden flex flex-col transition-all duration-300 ${
          isPageOneOrTwo 
            ? 'aspect-square rounded-full max-w-[500px] px-[16%] py-[15%] justify-between' 
            : isPage602
            ? 'h-auto rounded-2xl px-3 sm:px-6 py-4 sm:py-6 gap-y-2'
            : isPages603to604
            ? 'aspect-[1/1.5] rounded-2xl px-6 sm:px-10 py-5 justify-between'
            : 'aspect-[1/1.5] rounded-2xl p-[3%_4%] sm:p-[4%] justify-between'
        }`}
        dir="rtl"
      >
        {/* Main Document Grid */}
        <div className={`w-full flex flex-col select-text ${
          isShortPage && !isPages603to604 ? 'gap-y-2' : 'h-full justify-between py-1'
        }`}>
          {pageData.lines.map((line) => {
            const isSurahHeader = line.words.some((w) => w.type === 'surah_header');
            const isBismillah = line.words.some((w) => w.type === 'bismillah');

            // Center specific final verses on page 603 (Nasr 110:3, Masad 111:5) and page 604 (Ikhlas 112:4, Falaq 113:5, Nas 114:6)
            const isSpecialCenteredLine = 
              (pageData.page === 603 && (line.words.some((w) => w.verse_key === '110:3') || line.words.some((w) => w.verse_key === '111:5'))) ||
              (pageData.page === 604 && (line.words.some((w) => w.verse_key === '112:4') || line.words.some((w) => w.verse_key === '113:5') || line.words.some((w) => w.verse_key === '114:6')));

            // Alignment: Surah headers center; Bismillah centers; specific final verse lines center; other lines justify
            const lineAlignmentClass = isSurahHeader 
              ? 'justify-center neu-flat px-3 py-1 my-1 rounded-xl border border-amber-900/10' 
              : (isShortPage || isBismillah || isSpecialCenteredLine)
              ? 'justify-center gap-x-2' 
              : 'justify-between';

            return (
              <div 
                key={line.line} 
                className={`w-full max-w-full flex items-center select-text px-1 overflow-visible ${
                  isSurahHeader ? 'h-auto py-1' : isShortPage && !isPages603to604 ? 'h-auto py-1' : 'h-[5.8%]'
                } ${lineAlignmentClass}`}
              >
                {line.words.map((word, idx) => {
                  const activeFont = word.font || pageData.font;
                  const characterGlyph = word.char || String.fromCharCode(word.code);
                  
                  // Check if this word belongs to the active verse being played
                  const isHighlighted =
                    Boolean(isPlaying && activeVerseKey && word.verse_key === activeVerseKey);

                  return (
                    <span
                      key={idx}
                      data-verse={word.verse_key}
                      onClick={() => {
                        if (word.verse_key && onVerseClick) {
                          onVerseClick(word.verse_key);
                        }
                      }}
                      style={{ fontFamily: activeFont }}
                      title={word.verse_key ? `Ayat ${word.verse_key} (Tekan untuk main audio)` : undefined}
                      className={`mushaf-word select-text font-normal transition-colors duration-150 inline-block whitespace-nowrap ${
                        isSurahHeader 
                          ? 'text-[1.0em] sm:text-[1.25em] text-emerald-700 dark:text-emerald-400 font-normal px-1' 
                          : isBismillah
                          ? 'text-[1.15em] sm:text-[1.45em] text-emerald-700 dark:text-emerald-400 font-normal'
                          : 'text-[1.15em] sm:text-[1.45em]' // Exact uniform font size across all pages
                      } leading-none ${
                        word.type === 'word' 
                          ? `cursor-pointer px-0.5 transition-colors ${
                              isHighlighted
                                ? 'text-emerald-600 dark:text-emerald-400 font-normal'
                                : 'hover:text-emerald-500 text-neutral-900 dark:text-neutral-100'
                            }`
                          : word.type === 'end'
                          ? `cursor-pointer px-1 transition-colors ${
                              isHighlighted
                                ? 'text-emerald-600 dark:text-emerald-400 font-normal'
                                : 'text-emerald-600 dark:text-emerald-400 font-normal'
                            }`
                          : ''
                      }`}
                    >
                      {characterGlyph}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Page Number Indicator Badge (Outside the box) */}
      <div className="mt-3 flex justify-center select-none">
        <div className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium text-amber-900/80 dark:text-amber-100/70 border border-amber-900/10 shadow-sm">
          {pageData.page}
        </div>
      </div>
    </div>
  );
}