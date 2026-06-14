"use client";

import { useState } from "react";

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
    <main className="min-h-screen bg-green-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-green-800 mb-2">
          🌾 Farm Management System
        </h1>

        <p className="text-gray-600 mb-8">
          Manage your farms and agricultural activities
        </p>

        {/* Add Farm Section */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-2xl font-semibold mb-6">
            ➕ Add Farm
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">
                Farm Name
              </label>

              <input
                type="text"
                placeholder="Enter farm name"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="border p-3 w-full rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Area (Acres)
              </label>

              <input
                type="text"
                placeholder="Enter area in acres"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="border p-3 w-full rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Well Available?
              </label>

              <select
                value={well}
                onChange={(e) => setWell(e.target.value)}
                className="border p-3 w-full rounded-lg"
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Motor Available?
              </label>

              <select
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                className="border p-3 w-full rounded-lg"
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <button
              onClick={addFarm}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg"
            >
              Save Farm
            </button>
          </div>
        </div>

        {/* Farm List Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            🌾 My Farms
          </h2>

          <div className="space-y-4">
            {farms.map((farm) => (
              <div
                key={farm.id}
                className="bg-white p-6 rounded-xl shadow border"
              >
                <h3 className="text-xl font-bold text-green-800 mb-3">
                  {farm.name}
                </h3>

                <div className="space-y-1">
                  <p>
                    <strong>Area:</strong> {farm.area} Acres
                  </p>

                  <p>
                    <strong>Well:</strong> {farm.well}
                  </p>

                  <p>
                    <strong>Motor:</strong> {farm.motor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}