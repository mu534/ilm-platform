import { redirect, notFound } from "next/navigation";
import { prisma } from "../../../../lib/prism";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Lessons are edited inline inside the Course Builder.
 * Redirect bookmarked URLs to the correct course builder page.
 */
export default async function LegacyLectureEditRedirect({ params }: Props) {
  const { id } = await params;
  const lecture = await prisma.lecture.findUnique({
    where:  { id },
    select: { module: { select: { courseId: true } } },
  });

  if (!lecture?.module?.courseId) notFound();

  redirect(`/admin/courses/${lecture.module.courseId}/builder`);
}
