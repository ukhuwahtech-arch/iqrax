import React from "react";

export const TajwidTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-2xl neu-flat">
        <h2 className="text-xl font-bold mb-2">Panduan Tajwid</h2>
        <p className="text-sm opacity-80 leading-relaxed">
          Color-coded Tajwid rules and articulation points (Makhraj).
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-6 rounded-2xl neu-pressed flex justify-between items-center">
          <span className="font-semibold text-sm">Izhar Halqi</span>
          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold">Clear</span>
        </div>
        <div className="p-6 rounded-2xl neu-pressed flex justify-between items-center">
          <span className="font-semibold text-sm">Ikhfa' Haqiqi</span>
          <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">Concealed</span>
        </div>
      </div>
    </div>
  );
};