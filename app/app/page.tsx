"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";

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
    <div className="flex bg-green-50 min-h-screen">

      <Sidebar />

      <main className="flex-1 p-4">

        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="bg-white rounded-xl shadow p-3 mb-4 flex justify-between items-center">

            <div>
              <h1 className="text-3xl font-bold text-green-800">
                THUKIRA AGRO FARMS
              </h1>

              <p className="text-gray-600 text-sm">
                My Family Farm Management
              </p>
            </div>

            {/* Future Family Photo */}
            <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center text-3xl">
              👨‍🌾
            </div>

          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-gray-500 text-xs">
                Total Farms
              </h3>

              <p className="text-2xl font-bold text-green-700">
                {farms.length}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-gray-500 text-xs">
                Total Area
              </h3>

              <p className="text-2xl font-bold text-green-700">
                4.25 Acres
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-gray-500 text-xs">
                Active Crops
              </h3>

              <p className="text-2xl font-bold text-green-700">
                2
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-gray-500 text-xs">
                Monthly Income
              </h3>

              <p className="text-2xl font-bold text-green-700">
                ₹0
              </p>
            </div>

          </div>

          {/* Add Farm */}
          <div className="bg-white rounded-xl shadow p-3 mb-4">

            <h2 className="text-xl font-semibold mb-3">
              ➕ Add Farm
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">

              <input
                type="text"
                placeholder="Farm Name"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="border p-2 rounded-md"
              />

              <input
                type="number"
                step="0.01"
                placeholder="Area (Acres)"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="border p-2 rounded-md"
              />

              <select
                value={well}
                onChange={(e) => setWell(e.target.value)}
                className="border p-2 rounded-md"
              >
                <option>Well: Yes</option>
                <option>Well: No</option>
              </select>

              <select
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                className="border p-2 rounded-md"
              >
                <option>Motor: Yes</option>
                <option>Motor: No</option>
              </select>

              <button
                onClick={addFarm}
                className="bg-green-700 hover:bg-green-800 text-white rounded-md px-4 py-2"
              >
                Save Farm
              </button>

            </div>

          </div>

          {/* My Farms */}
          <div>

            <h2 className="text-xl font-semibold mb-3">
              🌾 My Farms
            </h2>

            <div className="space-y-2">

              {farms.map((farm) => (
                <Link
                  key={farm.id}
                  href="/farm"
                  className="block"
                >
                  <div className="bg-white rounded-xl shadow border p-3 hover:border-green-500 hover:shadow-lg transition">

                    <div className="flex justify-between items-center">

                      <div>
                        <h3 className="text-lg font-bold text-green-800">
                          {farm.name}
                        </h3>

                        <p className="text-sm text-gray-500">
                          Well: {farm.well} | Motor: {farm.motor}
                        </p>
                      </div>

                      <div className="text-green-700 font-bold">
                        {farm.area} Acres
                      </div>

                    </div>

                  </div>
                </Link>
              ))}

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}