import Link from "next/link";

const SECTIONS = [
  {
    title: "What data we collect",
    content:
      "We collect farm-related data that you enter including crop details, livestock information, financial records, and machinery data. We also collect your email address for authentication purposes only.",
  },
  {
    title: "How we use your data",
    content:
      "Your data is used only to provide farm management services within Marutham FMS. We do not sell, share, or use your data for any other purpose.",
  },
  {
    title: "Data Security",
    content:
      "All data is encrypted and stored securely on Supabase servers in secure data centers. Passwords are hashed using bcrypt and are never stored in plain text. We use HTTPS for all communications.",
  },
  {
    title: "Your Rights",
    content:
      "You can delete your account and all associated data at any time by contacting us. You have full ownership of all data you enter into the system.",
  },
  {
    title: "Contact",
    content: "For any privacy concerns, please contact the farm administrator.",
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🔐</span>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        </div>

        <p className="text-xs text-gray-400 mb-6">Last updated: July 2026</p>

        {SECTIONS.map((section, i) => (
          <div key={i} className="mb-6 pb-6 border-b border-gray-100 last:border-0">
            <h2 className="text-base font-semibold text-gray-800 mb-2">{section.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
          </div>
        ))}

        <Link href="/" className="inline-flex items-center gap-2 text-green-600 hover:underline text-sm font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
