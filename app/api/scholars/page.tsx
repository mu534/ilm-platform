x;
import { prisma } from "../../lib/prism";
import { ScholarCard } from "../../components/ScholarCard";

async function getScholars() {
  return prisma.scholar.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: {
      user: { select: { name: true, email: true, image: true } },
      _count: { select: { lectures: true } },
    },
  });
}

export const metadata = { title: "Scholars" };

export default async function ScholarsPage() {
  const scholars = await getScholars();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-2">
          Learn from
        </p>
        <h1 className="font-display text-4xl font-bold text-white">
          Our Scholars
        </h1>
        <p className="text-ink-400 mt-2">
          {scholars.length} scholars sharing their knowledge
        </p>
      </div>

      {scholars.length === 0 ? (
        <div className="text-center py-24 text-ink-500">
          <p className="font-display text-xl">No scholars yet</p>
          <p className="text-sm mt-2">
            Scholars will appear here once their profiles are created.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {scholars.map((scholar) => (
            <ScholarCard key={scholar.id} scholar={scholar as any} />
          ))}
        </div>
      )}
    </div>
  );
}
