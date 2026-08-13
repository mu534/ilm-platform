import Link from "next/link";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">Ilm Platform</p>
      <h1 className="font-display text-4xl font-semibold text-[var(--text-primary)] mb-6">Terms of Service</h1>
      <div className="space-y-5 text-[var(--text-secondary)] leading-relaxed">
        <p>By using Ilm Platform, you agree to use the service respectfully and in accordance with applicable laws.</p>
        <p>Course content is provided for learning. You may not copy, redistribute, or misuse content without permission from its owner.</p>
        <p>We may update these terms as the platform develops. Continued use after an update means you accept the revised terms.</p>
      </div>
      <Link href={`/${locale}/register`} className="inline-flex mt-10 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-light)]">
        ← Back to registration
      </Link>
    </main>
  );
}
