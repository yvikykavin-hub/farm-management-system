export default function FarmDetails() {
  return (
    <main className="min-h-screen bg-green-50 p-8">
      <div className="max-w-5xl mx-auto">

        <button className="mb-6 text-green-700 font-semibold">
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-6">

          <h1 className="text-3xl font-bold text-green-800 mb-2">
            🌾 Vettuvalyam Kaadu
          </h1>

          <p className="text-gray-600 mb-6">
            Total Area: 4.25 Acres
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                Survey Numbers
              </p>

              <p className="font-semibold">
                101, 102, 103
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                Patta Number
              </p>

              <p className="font-semibold">
                12345
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                Well Depth
              </p>

              <p className="font-semibold">
                180 Feet
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                Motor Number
              </p>

              <p className="font-semibold">
                MTR-001
              </p>
            </div>

          </div>

          <div className="bg-gray-50 border rounded-xl p-6">

            <div className="flex justify-between items-center mb-4">

              <h2 className="text-2xl font-semibold">
                Current Cultivations
              </h2>

              <button className="bg-green-700 text-white px-4 py-2 rounded-lg">
                + Add Cultivation
              </button>

            </div>

            <div className="space-y-3">

              <div className="bg-white border rounded-lg p-4">
                🥥 Coconut - 1.25 Acres
              </div>

              <div className="bg-white border rounded-lg p-4">
                🌾 Sugarcane - 2.95 Acres
              </div>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}