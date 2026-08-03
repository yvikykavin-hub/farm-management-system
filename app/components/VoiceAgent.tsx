"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import VoiceBottomSheet from "./VoiceBottomSheet";

interface VoiceAgentProps {
  language: string;
}

export default function VoiceAgent({ language }: VoiceAgentProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mic button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileTap={{ scale: 0.9 }}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        title={language === "ta" ? "குரல் உள்ளீடு" : "Voice Input"}
      >
        {/* Mic SVG icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>

        {/* Green dot indicator */}
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500" />
      </motion.button>

      {/* Bottom sheet */}
      <VoiceBottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} language={language} />
    </>
  );
}
