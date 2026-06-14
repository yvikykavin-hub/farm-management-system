import Link from "next/link";

export default function CultivationDetails() {
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
            🌾 Turmeric
          </h1>

          <p className="text-gray-600 mb-6">
            Area: 2 Acres
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">
                Expenses
              </h2>

              <p>
                Land Preparation
              </p>

              <p>
                Fertilizers
              </p>

              <p>
                Labour
              </p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">
                Income
              </h2>

              <p>
                Harvest Sales
              </p>

              <p>
                Yield Details
              </p>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}