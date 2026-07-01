import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prism";
import { registerSchema } from "../../../lib/validations";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../../utils/api";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per 15 minutes
    const ip     = getClientIp(req);
    const rl     = checkRateLimit(`register:${ip}`, { limit: 5, window: 900 });
    if (!rl.success) {
      return errorResponse("Too many registration attempts. Please try again later.", 429);
    }

    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) return errorResponse("Email already in use", 409);

    const hashed = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
