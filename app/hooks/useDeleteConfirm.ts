"use client";

import { useState, useCallback } from "react";

export function useDeleteConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const confirmDelete = useCallback((onConfirm: () => void) => {
    setOnConfirmCallback(() => onConfirm);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirmCallback?.();
    setIsOpen(false);
    setOnConfirmCallback(null);
  }, [onConfirmCallback]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setOnConfirmCallback(null);
  }, []);

  return {
    isOpen,
    confirmDelete,
    handleConfirm,
    handleCancel,
  };
}
