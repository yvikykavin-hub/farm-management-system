"use client";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  sheetName?: string;
  language?: string;
}

export default function ExportButton({ data, filename, sheetName = "Sheet1", language = "en" }: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert(language === "ta" ? "ஏற்றுமதி செய்ய தரவு இல்லை" : "No data to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const dateStr = new Date().toLocaleDateString("en-IN").replace(/\//g, "-");

    saveAs(blob, `${filename}-${dateStr}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-slate-700 hover:bg-green-100 dark:hover:bg-slate-600 text-green-700 dark:text-green-300 border border-green-200 dark:border-slate-600 text-sm font-medium transition-all duration-200"
    >
      <span>📊</span>
      <span>{language === "ta" ? "Excel பதிவிறக்கம்" : "Export Excel"}</span>
    </button>
  );
}
