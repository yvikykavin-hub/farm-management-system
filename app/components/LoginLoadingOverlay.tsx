"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import GrowingPlant from "./GrowingPlant";

interface LoginLoadingOverlayProps {
  show: boolean;
  displayName?: string;
  language?: string;
}

const loadingMessages = [
  { en: "Connecting to farm...", ta: "பண்ணையுடன் இணைக்கிறோம்..." },
  { en: "Verifying credentials...", ta: "சரிபார்க்கிறோம்..." },
  { en: "Loading your farm data...", ta: "பண்ணை தரவு ஏற்றுகிறோம்..." },
  { en: "Almost ready...", ta: "கிட்டத்தட்ட தயாராகிவிட்டோம்..." },
];

export default function LoginLoadingOverlay({ show, displayName, language = "en" }: LoginLoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPlant, setShowPlant] = useState(false);

  const L = (en: string, ta: string) => (language === "ta" ? ta : en);

  useEffect(() => {
    if (!show) {
      setMessageIndex(0);
      setShowWelcome(false);
      setShowPlant(false);
      return;
    }

    const plantTimer = setTimeout(() => setShowPlant(true), 300);

    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev >= loadingMessages.length - 1) {
          clearInterval(msgInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    const welcomeTimer = setTimeout(() => setShowWelcome(true), 3200);

    return () => {
      clearTimeout(plantTimer);
      clearInterval(msgInterval);
      clearTimeout(welcomeTimer);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#1B4332] overflow-hidden"
        >
          {/* Background glow circles */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-[500px] h-[500px] rounded-full bg-green-300 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1.3, 1, 1.3], opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute w-[700px] h-[700px] rounded-full bg-emerald-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
            {/* App name */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-white font-bold text-2xl tracking-wide">Marutham FMS</p>
              <p className="text-green-300 text-sm">உழைப்பே உயர்வு</p>
            </motion.div>

            {/* Plant OR Welcome */}
            <AnimatePresence mode="wait">
              {!showWelcome ? (
                <motion.div
                  key="plant"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                  className="my-2"
                >
                  {showPlant && <GrowingPlant />}
                </motion.div>
              ) : (
                <motion.div
                  key="welcome"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center gap-3 my-2"
                >
                  {/* Checkmark */}
                  <div className="w-24 h-24 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
                    <motion.svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <motion.path
                        d="M10 24 L20 34 L38 14"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </motion.svg>
                  </div>

                  {/* Welcome message */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <p className="text-white font-bold text-xl">
                      {displayName ? L(`Welcome, ${displayName}! 👋`, `வணக்கம் ${displayName}! 👋`) : L("Welcome! 👋", "வணக்கம்! 👋")}
                    </p>
                    <p className="text-green-300 text-sm mt-1">
                      {L("Taking you to your farm...", "உங்கள் பண்ணைக்கு அழைத்துச் செல்கிறோம்...")}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cycling messages */}
            <AnimatePresence mode="wait">
              {!showWelcome && (
                <motion.p
                  key={messageIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-green-200 text-sm font-medium min-h-[20px]"
                >
                  {L(loadingMessages[messageIndex].en, loadingMessages[messageIndex].ta)}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <div className="w-56 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 4, ease: "easeInOut" }}
                className="h-full rounded-full bg-gradient-to-r from-green-300 to-white"
              />
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {loadingMessages.map((_, i) => (
                <motion.div
                  key={loadingMessages[i].en}
                  animate={{ scale: messageIndex === i ? 1.4 : 1, opacity: messageIndex >= i ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-full transition-all duration-300 ${
                    messageIndex === i ? "w-3 h-3 bg-white" : messageIndex > i ? "w-2 h-2 bg-green-300" : "w-2 h-2 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
