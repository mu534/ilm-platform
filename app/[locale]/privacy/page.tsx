import Link from "next/link";
import { getLocale } from "next-intl/server";

export default async function PrivacyPage() {
  const locale = await getLocale();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">Ilm Platform</p>
      <h1 className="font-display text-4xl font-semibold text-[var(--text-primary)] mb-6">Privacy Policy</h1>
      <div className="space-y-5 text-[var(--text-secondary)] leading-relaxed">
        <p>We use your account information to provide learning features, manage your profile, and keep the platform secure.</p>
        <p>We do not sell your personal information. Information is shared only when needed to operate the service or when required by law.</p>
        <p>You can contact us to ask about, correct, or remove your personal information, subject to legal and service requirements.</p>
      </div>
      <Link href={`/${locale}/register`} className="inline-flex mt-10 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-light)]">
        ← Back to registration
      </Link>
    </main>
  );
}
