"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [farms, setFarms] = useState([
    {
      id: 1,
      name: "Vettuvalyam Kaadu",
      area: "4.25",
      well: "Yes",
      motor: "Yes",
    },
  ]);

  const [farmName, setFarmName] = useState("");
  const [area, setArea] = useState("");
  const [well, setWell] = useState("Yes");
  const [motor, setMotor] = useState("Yes");

  const addFarm = () => {
    if (!farmName || !area) {
      alert("Please enter Farm Name and Area");
      return;
    }

    const newFarm = {
      id: Date.now(),
      name: farmName,
      area,
      well,
      motor,
    };

    setFarms([...farms, newFarm]);

    setFarmName("");
    setArea("");
    setWell("Yes");
    setMotor("Yes");
  };

  return (
    <main className="min-h-screen bg-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-green-800 mb-1">
          🌾 THUKIRA AGRO FARMS
        </h1>

        <p className="text-gray-600 mb-4">
          My Family Farm Management
        </p>

        {/* Add Farm */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">
            ➕ Add Farm
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Farm Name"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="border p-2 rounded-lg"
            />

            <input
              type="number"
              step="0.01"
              placeholder="Area (Acres)"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="border p-2 rounded-lg"
            />

            <select
              value={well}
              onChange={(e) => setWell(e.target.value)}
              className="border p-2 rounded-lg"
            >
              <option>Well: Yes</option>
              <option>Well: No</option>
            </select>

            <select
              value={motor}
              onChange={(e) => setMotor(e.target.value)}
              className="border p-2 rounded-lg"
            >
              <option>Motor: Yes</option>
              <option>Motor: No</option>
            </select>

            <button
              onClick={addFarm}
              className="bg-green-700 hover:bg-green-800 text-white rounded-lg px-4 py-2"
            >
              Save Farm
            </button>
          </div>
        </div>

        {/* Farms */}
        <div>
          <h2 className="text-xl font-semibold mb-3">
            🌾 My Farms
          </h2>

          <div className="space-y-3">
            {farms.map((farm) => (
              <Link
                key={farm.id}
                href="/farm"
                className="block"
              >
                <div className="bg-white p-4 rounded-lg shadow border hover:border-green-500 hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-green-800">
                      {farm.name}
                    </h3>

                    <span className="font-semibold text-green-700">
                      {farm.area} Acres
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}