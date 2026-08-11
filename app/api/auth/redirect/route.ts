import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getPostLoginDestination } from "../../../lib/auth";

/**
 * API endpoint to determine the correct post-login destination based on user role.
 * This ensures server-side security by checking the database for the user's role
 * and onboarding status, preventing client-side manipulation.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const userRole = session.user.role as "ADMIN" | "INSTRUCTOR" | "USER";

  try {
    const destination = await getPostLoginDestination(userId, userRole);
    return NextResponse.json({ destination });
  } catch (error) {
    return NextResponse.json({ error: "Failed to determine destination" }, { status: 500 });
  }
}
