"use client";

import Link from "next/link";
import { useState } from "react";

export default function FarmDetails() {
  const [surveyNumbers, setSurveyNumbers] = useState("101, 102, 103");
  const [pattaNumber, setPattaNumber] = useState("12345");
  const [wellDetails, setWellDetails] = useState("180 Feet");
  const [motorDetails, setMotorDetails] = useState("MTR-001");

  const [cropName, setCropName] = useState("");
  const [cropArea, setCropArea] = useState("");

  const [cultivations, setCultivations] = useState([
    {
      id: 1,
      crop: "Coconut",
      area: "1.25",
    },
    {
      id: 2,
      crop: "Sugarcane",
      area: "2.95",
    },
  ]);

  const addCultivation = () => {
    if (!cropName || !cropArea) {
      alert("Please select a crop and enter area");
      return;
    }

    const newCultivation = {
      id: Date.now(),
      crop: cropName,
      area: cropArea,
    };

    setCultivations([...cultivations, newCultivation]);

    setCropName("");
    setCropArea("");
  };

  const saveFarmDetails = () => {
    alert("Farm Details Saved Successfully");
  };

  const getCropIcon = (crop: string) => {
    switch (crop) {
      case "Coconut":
        return "🥥";

      case "Sugarcane":
        return "🌾";

      case "Turmeric":
        return "🟡";

      case "Ellu":
        return "🌿";

      case "Kuchi Kilangu":
        return "🥔";

      case "Onion":
        return "🧅";

      case "Fodder Corn":
        return "🌽";

      default:
        return "🌱";
    }
  };

  return (
    <main className="min-h-screen bg-green-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="mb-6 inline-block text-green-700 font-semibold"
        >
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            🌾 Vettuvalyam Kaadu
          </h1>

          <p className="text-gray-600 mb-6">
            Total Area: 4.25 Acres
          </p>

          {/* Farm Information */}
          <div className="bg-green-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Farm Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block mb-2 font-medium">
                  Survey Numbers
                </label>

                <input
                  type="text"
                  value={surveyNumbers}
                  onChange={(e) => setSurveyNumbers(e.target.value)}
                  className="border p-3 w-full rounded-lg"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">
                  Patta Number
                </label>

                <input
                  type="text"
                  value={pattaNumber}
                  onChange={(e) => setPattaNumber(e.target.value)}
                  className="border p-3 w-full rounded-lg"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">
                  Well Details
                </label>

                <input
                  type="text"
                  value={wellDetails}
                  onChange={(e) => setWellDetails(e.target.value)}
                  className="border p-3 w-full rounded-lg"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">
                  Motor Details
                </label>

                <input
                  type="text"
                  value={motorDetails}
                  onChange={(e) => setMotorDetails(e.target.value)}
                  className="border p-3 w-full rounded-lg"
                />
              </div>
            </div>

            <button
              onClick={saveFarmDetails}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg mt-4"
            >
              Save Farm Details
            </button>
          </div>

          {/* Current Cultivations */}
          <div className="bg-gray-50 border rounded-xl p-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
              <h2 className="text-2xl font-semibold">
                Current Cultivations
              </h2>

              <div className="flex flex-wrap gap-2">
                <select
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="border p-2 rounded-lg min-w-[180px]"
                >
                  <option value="">Select Crop</option>
                  <option value="Coconut">Coconut</option>
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Turmeric">Turmeric</option>
                  <option value="Ellu">Ellu</option>
                  <option value="Kuchi Kilangu">Kuchi Kilangu</option>
                  <option value="Onion">Onion</option>
                  <option value="Fodder Corn">Fodder Corn</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Acres"
                  value={cropArea}
                  onChange={(e) => setCropArea(e.target.value)}
                  className="border p-2 rounded-lg w-24"
                />

                <button
                  onClick={addCultivation}
                  className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
                >
                  Add Cultivation
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {cultivations.map((item) => (
                <Link
                  key={item.id}
                  href={`/cultivation/${item.crop
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  className="block"
                >
                  <div className="bg-white border rounded-lg p-4 hover:border-green-500 hover:shadow-md transition">
                    {getCropIcon(item.crop)} {item.crop} - {item.area} Acres
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}