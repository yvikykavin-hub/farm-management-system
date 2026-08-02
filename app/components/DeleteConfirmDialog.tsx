"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  language?: string;
}

export default function DeleteConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  language = "en",
}: DeleteConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-5 w-full max-w-[280px]"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/20 mx-auto mb-3">
                <span className="text-xl">🗑️</span>
              </div>

              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center mb-1">
                {language === "ta" ? "நீக்கவா?" : "Delete?"}
              </h3>

              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">
                {language === "ta" ? "இதை மீட்டெடுக்க முடியாது." : "This cannot be undone."}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {language === "ta" ? "ரத்து" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onCancel();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                >
                  {language === "ta" ? "நீக்கு" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
