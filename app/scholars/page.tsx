import { prisma } from "../lib/prism";
import { ScholarCard } from "../components/scholars/ScholarCard";
import type { Scholar } from "@/app/types/auth.types";

export const metadata = { title: "Scholars" };

async function getScholars() {
  return prisma.scholar.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: {
      user:   { select: { name: true, email: true, image: true } },
      _count: { select: { lectures: true, followers: true, courses: true } },
    },
  });
}

type PrismaScholar = {
  id:             string;
  userId:         string;
  bio:            string;
  photo:          string | null;
  topics:         string[];
  qualifications: string[];
  featured:       boolean;
  verified:       boolean;
  user:           { name: string; email: string; image: string | null };
  _count:         { lectures: number; followers: number; courses: number };
};

function mapScholar(s: PrismaScholar): Scholar {
  return { ...s };
}

export default async function ScholarsPage() {
  const scholars = await getScholars();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-2">
          Learn from
        </p>
        <h1 className="font-display text-4xl font-bold text-[var(--text-primary)]">
          Our Scholars
        </h1>
        <p className="text-[var(--text-muted)] mt-2">
          {scholars.length} scholars sharing their knowledge
        </p>
      </div>

      {scholars.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-display text-xl text-[var(--text-primary)]">No scholars yet</p>
          <p className="text-sm mt-2 text-[var(--text-muted)]">
            Scholars will appear here once their profiles are created.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {scholars.map((scholar) => (
            <ScholarCard key={scholar.id} scholar={mapScholar(scholar as PrismaScholar)} />
          ))}
        </div>
      )}
    </div>
  );
}
