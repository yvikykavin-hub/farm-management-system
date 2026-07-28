import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-8xl mb-4">🌾</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-2">Page not found</p>
        <p className="text-sm text-gray-400 mb-6">பக்கம் கிடைக்கவில்லை</p>
        <Link
          href="/"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          ← Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
