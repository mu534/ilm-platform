// ESM seed script — run with: node prisma/seed.mjs
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

// Dynamic import to handle the generated client
const { PrismaClient } = await import("../generated/prisma/client.ts");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Quran",           slug: "quran",           icon: "📖", color: "#10b981", order: 1 },
  { name: "Tafsir",          slug: "tafsir",          icon: "📝", color: "#3b82f6", order: 2 },
  { name: "Hadith",          slug: "hadith",          icon: "📜", color: "#8b5cf6", order: 3 },
  { name: "Aqeedah",         slug: "aqeedah",         icon: "🌟", color: "#f59e0b", order: 4 },
  { name: "Fiqh",            slug: "fiqh",            icon: "⚖️", color: "#ef4444", order: 5 },
  { name: "Seerah",          slug: "seerah",          icon: "🕌", color: "#06b6d4", order: 6 },
  { name: "Arabic",          slug: "arabic",          icon: "🔤", color: "#84cc16", order: 7 },
  { name: "Islamic History", slug: "islamic-history", icon: "🏛️", color: "#f97316", order: 8 },
  { name: "Tazkiyah",        slug: "tazkiyah",        icon: "💎", color: "#a855f7", order: 9 },
  { name: "Dawah",           slug: "dawah",           icon: "🤲", color: "#14b8a6", order: 10 },
];

console.log("🌱 Seeding categories...");
for (const cat of CATEGORIES) {
  await prisma.category.upsert({
    where:  { slug: cat.slug },
    update: {},
    create: cat,
  });
  console.log(`  ✔ ${cat.name}`);
}
console.log("✅ Seed complete.");
await prisma.$disconnect();
