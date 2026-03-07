// src/components/Footer.tsx
import Link from "next/link";
import { GiMoon } from "react-icons/gi";
import { FiMail, FiGithub } from "react-icons/fi";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-900/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <GiMoon className="text-gold-400 text-xl" />
              <span className="font-display text-lg font-semibold">
                <span className="gradient-text">Ilm</span> Platform
              </span>
            </div>
            <p className="text-sm text-ink-400 leading-relaxed max-w-xs">
              Connecting seekers of knowledge with authentic Islamic
              scholarship. Free, accessible education for all.
            </p>
            <p className="arabic-bismillah text-lg mt-4">
              بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wider uppercase">
              Explore
            </h4>
            <ul className="space-y-2">
              {[
                ["/", "Home"],
                ["/lectures", "Lectures"],
                ["/scholars", "Scholars"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-ink-400 hover:text-gold-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wider uppercase">
              Account
            </h4>
            <ul className="space-y-2">
              {[
                ["/login", "Sign In"],
                ["/register", "Register"],
                ["/profile", "My Profile"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-ink-400 hover:text-gold-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} Ilm Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="mailto:info@ilmplatform.com"
              className="text-ink-500 hover:text-gold-400 transition-colors"
            >
              <FiMail size={16} />
            </a>
            <a
              href="https://github.com"
              className="text-ink-500 hover:text-gold-400 transition-colors"
            >
              <FiGithub size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
