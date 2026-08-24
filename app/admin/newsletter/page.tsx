import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import type { SessionUser } from "../../types/auth.types";
import { FiMail, FiUsers, FiUserX } from "react-icons/fi";

export const metadata = { title: "Newsletter Subscribers | Ilm Platform Admin" };

export default async function NewsletterAdminPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [active, total] = await Promise.all([
    prisma.newsletterSubscription.findMany({
      where: { active: true },
      orderBy: { subscribedAt: "desc" },
    }),
    prisma.newsletterSubscription.count(),
  ]);

  const inactive = total - active.length;

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Newsletter</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Subscribers</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Manage newsletter subscribers and send course notifications.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Active Subscribers", value: active.length, icon: <FiMail size={16} />, color: "text-emerald-400" },
          { label: "Total (all time)", value: total, icon: <FiUsers size={16} />, color: "text-[var(--accent)]" },
          { label: "Unsubscribed", value: inactive, icon: <FiUserX size={16} />, color: "text-[var(--text-muted)]" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5 border border-[var(--border)]">
            <div className={`flex items-center gap-2 mb-2 ${s.color}`}>
              {s.icon}
              <span className="text-xs font-medium text-[var(--text-muted)]">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Subscriber list */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Active Subscribers ({active.length})
          </h2>
        </div>
        {active.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <FiMail size={32} className="mx-auto mb-3 opacity-30" />
            <p>No subscribers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Email", "Subscribed"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {active.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-5 py-3 text-sm text-[var(--text-primary)]">{sub.email}</td>
                    <td className="px-5 py-3 text-xs text-[var(--text-muted)]">
                      {sub.subscribedAt.toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
