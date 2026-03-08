import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { formatDate } from "../../utils/api";
import { AdminLectureActions } from "../../components/admin/LectureActions";
import { FiPlus, FiEye, FiMessageCircle } from "react-icons/fi";

async function getLectures(role: string, userId: string) {
  const where = role === "ADMIN" ? {} : { authorId: userId };
  return prisma.lecture.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });
}

export default async function AdminLecturesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const lectures = await getLectures(user?.role, user?.id);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Lectures
          </h1>
          <p className="text-ink-400 text-sm mt-1">{lectures.length} total</p>
        </div>
        <Link
          href="/admin/lectures/new"
          className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <FiPlus /> New Lecture
        </Link>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                Title
              </th>
              <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                Stats
              </th>
              <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                Date
              </th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {lectures.map((lecture) => (
              <tr
                key={lecture.id}
                className="hover:bg-white/2 transition-colors"
              >
                <td className="p-4">
                  <div>
                    <p className="text-sm text-white font-medium line-clamp-1">
                      {lecture.title}
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {lecture.author.name}
                    </p>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-xs text-ink-400 bg-ink-800/60 px-2 py-1 rounded-lg">
                    {lecture.type}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full w-fit ${lecture.published ? "bg-green-900/30 text-green-400" : "bg-ink-700 text-ink-400"}`}
                    >
                      {lecture.published ? "Published" : "Draft"}
                    </span>
                    {lecture.featured && (
                      <span className="text-xs px-2 py-0.5 rounded-full w-fit bg-gold-900/30 text-gold-400">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3 text-xs text-ink-500">
                    <span className="flex items-center gap-1">
                      <FiEye size={11} /> {lecture.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMessageCircle size={11} /> {lecture._count.comments}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-xs text-ink-500">
                  {formatDate(lecture.createdAt)}
                </td>
                <td className="p-4">
                  <AdminLectureActions lecture={lecture as any} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lectures.length === 0 && (
          <div className="text-center py-16 text-ink-500">
            <FiPlus className="mx-auto text-3xl mb-3 text-ink-700" />
            <p>No lectures yet.</p>
            <Link
              href="/admin/lectures/new"
              className="text-gold-400 text-sm hover:text-gold-300 mt-2 inline-block"
            >
              Create one →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
