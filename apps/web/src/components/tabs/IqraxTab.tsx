// C:\Users\dxiau\iqrax\apps\web\src\components\tabs\IqraxTab.tsx
"use client";

import React, { useState } from "react";

const HIJAIYAH_LETTERS = [
  "أ", "ب", "ت", "ث", "ج", "ح",
  "خ", "د", "ذ", "ر", "ز", "س",
  "ش", "ص", "ض", "ط", "ظ", "ع",
  "غ", "ف", "ق", "ك", "ل", "م",
  "ن", "هـ", "و", "ي", "ء", "ة",
  "لا", "أ", "إ", "آ", "ؤ", "ئ"
];

export const IqraxTab: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);

  return (
    <div className="w-full max-w-xl mx-auto p-3 animate-fade-in space-y-4 pb-12">
      <style jsx>{`
        .emerald-icon {
          filter: brightness(0) saturate(100%) invert(42%) sepia(87%) saturate(614%) hue-rotate(120deg) brightness(93%) contrast(93%);
        }
      `}</style>

      {/* Soft seamless grid */}
      <div className="grid grid-cols-6 gap-3 sm:gap-4 p-3 rounded-3xl neu-pressed bg-opacity-40">
        {HIJAIYAH_LETTERS.map((letter, index) => (
          <button
            key={index}
            onClick={() => {
              console.log(`Selected letter: ${letter}`);
            }}
            className="aspect-square flex items-center justify-center neu-flat hover:neu-pressed active:neu-pressed transition-all cursor-pointer text-3xl sm:text-4xl font-uthmanic font-normal text-neutral-900 dark:text-neutral-100 rounded-2xl shadow-sm border border-black/5 dark:border-white/5"
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Compact Navigation Bar matching QuranTab */}
      <div className="flex justify-center select-none gap-4 items-center pt-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage <= 1}
          aria-label="Halaman Sebelumnya"
          className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm disabled:opacity-30 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <img src="/icons/prev.svg" alt="Prev" className="w-3.5 h-3.5 emerald-icon" />
        </button>

        <div className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm">
          {currentPage}
        </div>

        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, 6))}
          disabled={currentPage >= 6}
          aria-label="Halaman Seterusnya"
          className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-amber-900/10 shadow-sm disabled:opacity-30 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <img src="/icons/next.svg" alt="Next" className="w-3.5 h-3.5 emerald-icon" />
        </button>
      </div>

      {/* Description Section */}
      <div className="p-4 rounded-2xl neu-flat space-y-1.5 text-xs">
        <h3 className="font-bold text-emerald-600 dark:text-emerald-400">Description</h3>
        <p className="opacity-75 leading-relaxed">
          Pilih huruf Hijaiyah di atas untuk mula mengenali asas sebutan dan bentuk huruf Iqra&apos; peringkat {currentPage}.
        </p>
      </div>
    </div>
  );
};