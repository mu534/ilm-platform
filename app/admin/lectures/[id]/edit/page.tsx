import { redirect, notFound } from "next/navigation";
import { prisma } from "../../../../lib/prism";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Lessons are edited entirely inline inside the Course Builder now
 * (title, description, content, media, resources — all of it).
 * Anyone who still has this URL bookmarked gets sent to the right
 * course's builder instead of a 404.
 */
export default async function LegacyLectureEditRedirect({ params }: Props) {
  const { id } = await params;
  const lecture = await prisma.lecture.findUnique({
    where:  { id },
    select: { module: { select: { courseId: true } } },
  });
  const { defaultLocale } = await import("@/i18n/config");

  if (!lecture?.module?.courseId) notFound();

  redirect(`/${defaultLocale}/admin/courses/${lecture.module.courseId}/builder`);
}
