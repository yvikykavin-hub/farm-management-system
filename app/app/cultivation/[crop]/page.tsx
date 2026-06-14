"use client";

import Link from "next/link";
import { use } from "react";
import { useState } from "react";

export default function CropPage({
  params,
}: {
  params: Promise<{ crop: string }>;
}) {
  const { crop } = use(params);

  let quantityLabel = "Quantity";
  let cropDisplayName = crop;
  let cropIcon = "🌾";

  switch (crop) {
    case "coconut":
  cropIcon = "🥥";
  break;

case "sugarcane":
  cropIcon = "🌾";
  break;

case "turmeric":
  cropIcon = "🟡";
  break;

case "ellu":
  cropIcon = "🌿";
  break;

case "kuchi-kilangu":
  cropIcon = "🥔";
  break;

case "onion":
  cropIcon = "🧅";
  break;

case "fodder-corn":
  cropIcon = "🌽";
  break;

    default:
      quantityLabel = "Quantity";
  }

  const [varietyName, setVarietyName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [spacing, setSpacing] = useState("");

  const saveCultivationDetails = () => {
    alert("Cultivation Details Saved Successfully");
  };

  return (
    <main className="min-h-screen bg-green-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/farm"
          className="mb-6 inline-block text-green-700 font-semibold"
        >
          ← Back to Farm
        </Link>

        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            {cropIcon} {cropDisplayName}
          </h1>

          <p className="text-gray-600 mb-6">
            Cultivation Details
          </p>

          {/* Basic Information */}
          <div className="bg-green-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Basic Information
            </h2>

            <div
              className={`grid gap-4 ${
                crop === "coconut"
                  ? "grid-cols-1 md:grid-cols-4"
                  : "grid-cols-1 md:grid-cols-3"
              }`}
            >
              <div>
                <label className="block mb-2 font-medium">
                  Variety Name
                </label>

                <input
                  type="text"
                  placeholder="Enter variety name"
                  value={varietyName}
                  onChange={(e) => setVarietyName(e.target.value)}
                  className="border p-3 w-full rounded-lg"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">
                  {quantityLabel}
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="border p-3 w-full rounded-lg"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">
                  Planting Date
                </label>

                <input
                  type="date"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  className="border p-3 w-full rounded-lg"
                />
              </div>

              {crop === "coconut" && (
                <div>
                  <label className="block mb-2 font-medium">
                    Spacing
                  </label>

                  <input
                    type="text"
                    placeholder="25 x 25 Feet"
                    value={spacing}
                    onChange={(e) => setSpacing(e.target.value)}
                    className="border p-3 w-full rounded-lg"
                  />
                </div>
              )}
            </div>

            <button
              onClick={saveCultivationDetails}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg mt-4"
            >
              Save Cultivation Details
            </button>
          </div>

          {/* Expenses & Income */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-3">
                Expenses
              </h2>

              <p className="text-gray-500">
                Coming Soon...
              </p>
            </div>

            <div className="bg-gray-50 border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-3">
                Income
              </h2>

              <p className="text-gray-500">
                Coming Soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}