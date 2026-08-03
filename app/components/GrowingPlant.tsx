"use client";

import { motion } from "framer-motion";

export default function GrowingPlant() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <motion.ellipse
        cx="100"
        cy="170"
        rx="60"
        ry="10"
        fill="#4ade80"
        opacity="0.4"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />

      {/* Seed */}
      <motion.ellipse
        cx="100"
        cy="168"
        rx="8"
        ry="5"
        fill="#92400e"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.3, delay: 0.8 }}
      />

      {/* Stem */}
      <motion.line
        x1="100"
        y1="170"
        x2="100"
        y2="80"
        stroke="#4ade80"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      />

      {/* Left branch */}
      <motion.path
        d="M100 130 Q70 110 60 90"
        stroke="#4ade80"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.3 }}
      />

      {/* Right branch */}
      <motion.path
        d="M100 120 Q130 100 140 80"
        stroke="#4ade80"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      />

      {/* Left leaf */}
      <motion.ellipse
        cx="58"
        cy="86"
        rx="18"
        ry="10"
        fill="#22c55e"
        transform="rotate(-40 58 86)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 1.7 }}
      />

      {/* Right leaf */}
      <motion.ellipse
        cx="142"
        cy="76"
        rx="18"
        ry="10"
        fill="#22c55e"
        transform="rotate(40 142 76)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 1.9 }}
      />

      {/* Top leaf */}
      <motion.ellipse
        cx="100"
        cy="72"
        rx="20"
        ry="12"
        fill="#16a34a"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 2.1 }}
      />

      {/* Flower petals */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const px = 100 + Math.cos((angle * Math.PI) / 180) * 18;
        const py = 58 + Math.sin((angle * Math.PI) / 180) * 18;
        return (
          <motion.ellipse
            key={angle}
            cx={px}
            cy={py}
            rx="8"
            ry="5"
            fill="#fde68a"
            transform={`rotate(${angle} ${px} ${py})`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 10, delay: 2.3 + i * 0.05 }}
          />
        );
      })}

      {/* Flower center */}
      <motion.circle
        cx="100"
        cy="58"
        r="12"
        fill="#fbbf24"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 10, delay: 2.2 }}
      />

      {/* Flower center dot */}
      <motion.circle
        cx="100"
        cy="58"
        r="6"
        fill="#f59e0b"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 10, delay: 2.8 }}
      />

      {/* Sparkles */}
      {[
        { x: 72, y: 38 },
        { x: 128, y: 36 },
        { x: 118, y: 70 },
        { x: 80, y: 72 },
      ].map((pos, i) => (
        <motion.text
          key={`${pos.x}-${pos.y}`}
          x={pos.x}
          y={pos.y}
          fontSize="14"
          textAnchor="middle"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.8] }}
          transition={{ duration: 0.5, delay: 2.9 + i * 0.1 }}
        >
          ✨
        </motion.text>
      ))}
    </svg>
  );
}
