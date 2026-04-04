"use client";

import { useState } from "react";
import { FiMail, FiCheck } from "react-icons/fi";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubscribed) return;

    setIsLoading(true);

   
    setTimeout(() => {
      setIsSubscribed(true);
      setIsLoading(false);
      setEmail("");
    }, 1000);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="relative rounded-3xl overflow-hidden border border-gold-500/20 bg-gradient-to-r from-gold-900/10 via-ink-900 to-ink-900">
        <div className="absolute inset-0 pattern-overlay opacity-10" />
        <div className="relative px-6 py-12 sm:py-16 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-6">
            <FiMail className="text-gold-400 text-2xl" />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
            Stay Updated with New Knowledge
          </h2>

          <p className="text-ink-300 mb-8 max-w-md text-sm sm:text-base leading-relaxed">
            Get notified about new lectures, featured scholars, and exclusive content
            delivered to your inbox.
          </p>

          {isSubscribed ? (
            <div className="flex items-center gap-3 px-6 py-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <FiCheck className="text-green-400 text-lg" />
              <span className="text-green-400 font-medium">Successfully subscribed!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-md">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-11 pr-4 py-3.5 bg-ink-800/80 border border-white/10 rounded-xl text-white placeholder-ink-500 focus:outline-none focus:border-gold-500/40 text-sm backdrop-blur-sm transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="flex-shrink-0 px-6 py-3.5 bg-gold-600 hover:bg-gold-500 disabled:bg-ink-600 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </div>
            </form>
          )}

          <p className="text-ink-400 text-xs mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
}