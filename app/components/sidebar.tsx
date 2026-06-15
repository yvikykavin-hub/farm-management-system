"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 min-h-screen bg-green-800 text-white p-5">

      {/* Profile Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-green-800 text-2xl font-bold mb-3">
          👤
        </div>

        <h2 className="text-lg font-bold text-center">
          THUKIRA AGRO FARMS
        </h2>

        <p className="text-sm text-green-100 text-center">
          Family Farm Management
        </p>
      </div>

      {/* Menu */}
      <nav className="space-y-2">

        <Link
          href="/"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          📊 Dashboard
        </Link>

        <Link
          href="/farm"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          🌾 Farms
        </Link>

        <Link
          href="/cultivation"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          🌱 Crops
        </Link>

        <Link
          href="/reports"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          📈 Reports
        </Link>

        <Link
          href="/income"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          💰 Income
        </Link>

        <Link
          href="/expenses"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          💸 Expenses
        </Link>

        <Link
          href="/settings"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          ⚙️ Settings
        </Link>

        <Link
          href="/language"
          className="block p-3 rounded-lg hover:bg-green-700"
        >
          🌐 Language
        </Link>

        <button
          className="w-full text-left p-3 rounded-lg hover:bg-red-700"
        >
          🚪 Logout
        </button>

      </nav>
    </div>
  );
}