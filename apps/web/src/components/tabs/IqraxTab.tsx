// C:\Users\dxiau\iqrax\apps\web\src\components\tabs\IqraxTab.tsx
"use client";

import React from "react";

const HIJAIYAH_LETTERS = [
  "أ", "ب", "ت", "ث", "ج", "ح",
  "خ", "د", "ذ", "ر", "ز", "س",
  "ش", "ص", "ض", "ط", "ظ", "ع",
  "غ", "ف", "ق", "ك", "ل", "م",
  "ن", "هـ", "و", "ي", "ء", "ة",
  "لا", "أ", "إ", "آ", "ؤ", "ئ"
];

export const IqraxTab: React.FC = () => {
  return (
    <div className="w-full max-w-xl mx-auto p-2 animate-fade-in">
      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {HIJAIYAH_LETTERS.map((letter, index) => (
          <button
            key={index}
            onClick={() => {
              console.log(`Selected letter: ${letter}`);
            }}
            className="aspect-square flex items-center justify-center neu-flat hover:neu-pressed active:neu-pressed transition-all cursor-pointer text-3xl sm:text-4xl font-uthmanic font-normal text-neutral-900 dark:text-neutral-100 rounded-2xl"
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
};