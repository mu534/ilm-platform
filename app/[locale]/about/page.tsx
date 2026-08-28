import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import {
  FiCompass, FiLayers, FiUsers, FiAward,
  FiBookOpen, FiHeart, FiArrowRight, FiTarget,
} from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";

export const metadata = {
  title: "About Us | Ilm Platform",
  description:
    "Ilm Platform exists to make authentic Islamic knowledge accessible to everyone — especially new Muslims taking their first steps — by organizing it into clear, structured, and verified learning paths.",
};

type Pillar = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const pillars: Pillar[] = [
  {
    icon: <FiLayers className="w-5 h-5 text-[var(--accent)]" />,
    title: "Knowledge, Organized",
    description:
      "Instead of scattered videos and conflicting sources, every subject on Ilm Platform is broken down into categories, courses, modules, and lessons — so knowledge builds on knowledge, in the right order.",
  },
  {
    icon: <FiCompass className="w-5 h-5 text-[var(--accent)]" />,
    title: "Built for a Fresh Start",
    description:
      "Every path is designed so a new Muslim can begin with the true foundations of the faith — belief, worship, and character — before moving into deeper study, with nothing assumed and nothing skipped.",
  },
  {
    icon: <FiUsers className="w-5 h-5 text-[var(--accent)]" />,
    title: "Verified Scholars",
    description:
      "Courses and lectures are taught and reviewed by qualified scholars, so learners can trust that what they are studying is sound, sourced, and authentic.",
  },
  {
    icon: <FiAward className="w-5 h-5 text-[var(--accent)]" />,
    title: "Progress You Can See",
    description:
      "Track lessons completed, take quizzes to test understanding, and earn verifiable certificates — clear proof of a learning journey, from first steps to mastery.",
  },
];

const audiences = [
  {
    icon: <FiHeart className="w-6 h-6 text-[var(--accent)]" />,
    title: "New Muslims",
    description:
      "For those who have just embraced Islam, or are exploring it for the first time — a guided, judgment-free starting point that begins from scratch and explains the 'why,' not just the 'what.'",
  },
  {
    icon: <FiBookOpen className="w-6 h-6 text-[var(--accent)]" />,
    title: "Lifelong Learners",
    description:
      "For born Muslims and long-time students of knowledge who want to deepen their understanding through structured courses instead of piecing information together on their own.",
  },
  {
    icon: <FiTarget className="w-6 h-6 text-[var(--accent)]" />,
    title: "Scholars & Educators",
    description:
      "For teachers and scholars who want a home to organize their courses, lectures, and quizzes, and reach students who are actively seeking authentic knowledge.",
  },
];

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`);
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  return (
    <main className="w-full">
      {/* ── Hero ── */}
      <section className="relative w-full overflow-hidden" aria-labelledby="about-hero-heading">
        <div className="absolute inset-0 hero-bg opacity-80" aria-hidden="true" />
        <div className="absolute inset-0 pattern-overlay opacity-20" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 hero-line" aria-hidden="true" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
            <Image
              src="/logo.png"
              alt="Ilm Platform"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 mb-5">
            <GiStarFormation className="text-[var(--accent)] text-xs" aria-hidden="true" />
            <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
              About Us
            </span>
            <GiStarFormation className="text-[var(--accent)] text-xs" aria-hidden="true" />
          </div>

          <p
            className="arabic-bismillah text-2xl sm:text-3xl mb-7"
            lang="ar"
            aria-label="Bismillah ir-Rahman ir-Raheem"
          >
            بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ
          </p>

          <h1
            id="about-hero-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight mb-6 text-[var(--text-primary)]"
          >
            Islamic Knowledge, <span className="gradient-text">Organized</span> for Everyone
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Ilm Platform exists to make comprehensive, authentic Islamic knowledge accessible to
            everyone — with a special place in our hearts for those who have newly embraced
            Islam and are starting to learn their faith from scratch.
          </p>
        </div>
      </section>

      {/* ── Mission statement ── */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="mission-heading">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-4 text-center">
          Our Mission
        </p>
        <h2
          id="mission-heading"
          className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] leading-snug text-center mb-8"
        >
          &ldquo;Seek knowledge from the cradle to the grave.&rdquo;
        </h2>
        <div className="space-y-5 text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed text-center max-w-3xl mx-auto">
          <p>
            The word <em>&ldquo;Ilm&rdquo;</em> means knowledge. Our mission is simple: give every
            person — regardless of where they are starting from — a clear, comprehensive, and
            trustworthy path to understanding Islam.
          </p>
          <p>
            We built this platform with new Muslims especially in mind. Reverting to Islam can be
            overwhelming — there is so much to learn, and so much conflicting information online.
            Ilm Platform is here to walk alongside them from the very beginning, explaining Islam
            from scratch, one solid foundation at a time.
          </p>
          <p>
            But our purpose does not stop there. Islamic knowledge is vast, and too often scattered
            across disconnected videos, PDFs, and social media posts. Ilm Platform exists to{" "}
            <strong className="text-[var(--text-primary)] font-semibold">organize</strong> that
            knowledge — structuring it into categories, courses, modules, and lessons — so that
            anyone, at any stage of their journey, can learn in a clear and connected way, guided by
            qualified scholars.
          </p>
        </div>
      </section>

      {/* ── Who we're for ── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20" aria-labelledby="who-for-heading">
        <div className="text-center mb-12">
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-3">
            Who We Serve
          </p>
          <h2
            id="who-for-heading"
            className="font-display text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] leading-tight"
          >
            A Home for Every Seeker of Knowledge
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-7 transition-colors duration-300 hover:border-[var(--border-strong)]"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-dim)] border border-[var(--border)] flex items-center justify-center mb-5">
                {a.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
                {a.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {a.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How we organize knowledge (pillars) ── */}
      <section className="w-full" aria-labelledby="pillars-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-4">
                How We Do It
              </p>
              <h2
                id="pillars-heading"
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--text-primary)] leading-tight"
              >
                From Scratch to Mastery
              </h2>
              <div className="mt-6 h-px bg-gradient-to-r from-[var(--border-strong)] to-transparent w-32" aria-hidden="true" />
              <p className="mt-6 text-[var(--text-secondary)] text-base leading-relaxed max-w-md">
                Ilm Platform is built on four simple commitments that shape every course, lecture,
                and quiz we publish.
              </p>
            </div>

            <div className="flex flex-col gap-8">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="flex gap-5 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border)] flex items-center justify-center mt-0.5 transition-colors duration-300 group-hover:border-[var(--border-strong)] group-hover:bg-[var(--bg-card)]">
                    {pillar.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-body text-base font-semibold text-[var(--text-primary)] mb-1.5">
                      {pillar.title}
                    </h3>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24" aria-labelledby="about-cta-heading">
        <div className="relative rounded-3xl overflow-hidden border border-[var(--border-strong)]">
          <div className="absolute inset-0 hero-bg opacity-80" aria-hidden="true" />
          <div className="absolute inset-0 pattern-overlay opacity-20" aria-hidden="true" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 50% 100%, var(--accent-dim), transparent)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-0 hero-line" aria-hidden="true" />

          <div className="relative px-6 py-14 sm:py-20 flex flex-col items-center text-center">
            <h2
              id="about-cta-heading"
              className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight max-w-2xl"
            >
              Wherever You Are Starting From, Start Here
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md text-sm sm:text-base leading-relaxed">
              Whether you took your Shahada yesterday or have studied Islam for years, there is a
              structured path here for you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isLoggedIn && (
                <Link
                  href={localHref("/register")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold shadow-md shadow-gold-600/30 hover:shadow-gold-500/40 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
                >
                  Create Free Account <FiArrowRight size={15} />
                </Link>
              )}
              <Link
                href={localHref("/courses")}
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text-primary)] rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
              >
                Browse Courses
              </Link>
              {isLoggedIn && (
                <Link
                  href={localHref("/dashboard")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold shadow-md shadow-gold-600/30 hover:shadow-gold-500/40 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
                >
                  Go to Dashboard <FiArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
