export default function Home() {
  return (
    <main className="min-h-screen bg-green-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-green-800 mb-2">
          🌾 Farm Management System
        </h1>

        <p className="text-gray-600 mb-8">
          Personal Agriculture Management Portal
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold">🌾 Farms</h2>
            <p className="text-gray-600 mt-2">
              Manage farms, survey numbers and cultivations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold">🐄 Cattle</h2>
            <p className="text-gray-600 mt-2">
              Track feed expenses and milk production.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold">🚜 Tractor</h2>
            <p className="text-gray-600 mt-2">
              Track fuel, service and repairs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold">📊 Reports</h2>
            <p className="text-gray-600 mt-2">
              View crop and income reports.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}