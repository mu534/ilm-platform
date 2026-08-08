import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prism";
import { publicCourseWhere } from "../../../../lib/courseAccess";
import { CheckoutSuccessPoller } from "../../../../components/courses/CheckoutSuccessPoller";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CheckoutSuccessPage({ params }: Props) {
  const { slug } = await params;
  const course = await prisma.course.findFirst({
    where:  { slug, ...publicCourseWhere },
    select: { id: true, slug: true, title: true },
  });
  if (!course) notFound();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <CheckoutSuccessPoller courseId={course.id} courseSlug={course.slug} courseTitle={course.title} />
    </div>
  );
}
