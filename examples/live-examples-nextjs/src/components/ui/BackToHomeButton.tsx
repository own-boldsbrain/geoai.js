"use client";

import { ArrowLeft } from 'lucide-react';

interface BackToHomeButtonProps {
  className?: string;
}

export default function BackToHomeButton({ className = "" }: BackToHomeButtonProps) {
  return (
    <a
      href="/geoai-live"
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/70 hover:bg-gray-700/70 text-white font-medium text-xs rounded-md transition-all duration-200 backdrop-blur-sm border border-gray-600/40 hover:border-gray-500/40 shadow-md hover:shadow-lg ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Back</span>
    </a>
  );
}
