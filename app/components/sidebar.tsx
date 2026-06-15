"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-52 min-h-screen bg-green-800 text-white p-4">

      {/* Profile Section */}
      <div className="flex flex-col items-center mb-5">

        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-green-800 text-xl mb-2">
          👤
        </div>

        <h2 className="text-base font-bold text-center">
          THUKIRA AGRO FARMS
        </h2>

        <p className="text-xs text-green-100 text-center">
          My Family Farm Management
        </p>

      </div>

      {/* Navigation */}
      <nav className="space-y-1">

        <Link
          href="/"
          className="block p-2 rounded-lg hover:bg-green-700 transition"
        >
          📊 Dashboard
        </Link>

        <Link
          href="/farm"
          className="block p-2 rounded-lg hover:bg-green-700 transition"
        >
          🌾 Farms
        </Link>

        <Link
          href="/cultivation"
          className="block p-2 rounded-lg hover:bg-green-700 transition"
        >
          🌱 Crops
        </Link>

        <div className="block p-2 rounded-lg hover:bg-green-700 transition cursor-pointer">
          📈 Reports
        </div>

        <div className="block p-2 rounded-lg hover:bg-green-700 transition cursor-pointer">
          💰 Income
        </div>

        <div className="block p-2 rounded-lg hover:bg-green-700 transition cursor-pointer">
          💸 Expenses
        </div>

        <div className="block p-2 rounded-lg hover:bg-green-700 transition cursor-pointer">
          ⚙️ Settings
        </div>

        <div className="block p-2 rounded-lg hover:bg-green-700 transition cursor-pointer">
          🌐 Language
        </div>

        <div className="block p-2 rounded-lg hover:bg-red-700 transition cursor-pointer">
          🚪 Logout
        </div>

      </nav>
    </div>
  );
}