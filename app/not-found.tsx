import Link from "next/link";
import { GiMoon } from "react-icons/gi";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <GiMoon className="text-gold-400 text-6xl mx-auto mb-6 opacity-50" />
        <h1 className="font-display text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-ink-400 mb-8">This page could not be found.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-white rounded-xl font-medium transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
