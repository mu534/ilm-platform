import { NextRequest } from "next/server";
import { courseSchema } from "../../lib/validations";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import {
  requireAdminOrScholar,
  getOptionalUser,
  requireScholarAttribution,
} from "../../lib/authorization";
import { CourseService } from "../../lib/services/courseService";


export async function GET(req: NextRequest) {
  try {
    const user = await getOptionalUser();
    const { searchParams } = new URL(req.url);

    const result = await CourseService.getCourses(
      {
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 12,
        search: searchParams.get("search") ?? "",
        categoryId: searchParams.get("categoryId") ?? "",
        difficulty: searchParams.get("difficulty") ?? "",
        featured: searchParams.get("featured") === "true",
        scholarId: searchParams.get("scholarId") ?? "",
        published: searchParams.get("published"),
        myContent: searchParams.get("myContent") === "true",
      },
      user,
    );

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// ── POST /api/courses ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`course-create:${ip}`, { limit: 20, window: 3600 });
  if (!rl.success) return errorResponse("Too many requests. Please try again later.", 429);

  try {
    const user = await requireAdminOrScholar();
    const body = (await req.json()) as unknown;
    const data = courseSchema.parse(body);
    if (data.scholarId) await requireScholarAttribution(data.scholarId, user);

    const course = await CourseService.createCourse(user, data);
    return successResponse(course, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
