import { prisma } from "../prism";
import { HttpError } from "../httpError";

export class ScholarService {
  static async getScholarById(scholarId: string) {
    const scholar = await prisma.scholar.findUnique({
      where: { id: scholarId },
      include: {
        user: { select: { id: true, name: true, image: true, email: true, bio: true } },
        courses: {
          where: { published: true, approvalStatus: "APPROVED" },
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            difficulty: true,
            estimatedDuration: true,
          },
        },
        _count: { select: { followers: true, courses: true, lectures: true } },
      },
    });

    if (!scholar) throw new HttpError("Scholar not found", 404);
    return scholar;
  }

  static async followScholar(userId: string, scholarId: string) {
    const scholar = await prisma.scholar.findUnique({ where: { id: scholarId } });
    if (!scholar) throw new HttpError("Scholar not found", 404);

    if (scholar.userId === userId) {
      throw new HttpError("You cannot follow your own scholar profile", 400);
    }

    const existing = await prisma.scholarFollow.findUnique({
      where: { userId_scholarId: { userId, scholarId } },
    });

    if (existing) {
      await prisma.scholarFollow.delete({
        where: { userId_scholarId: { userId, scholarId } },
      });
      const followerCount = await prisma.scholarFollow.count({ where: { scholarId } });
      return { following: false, followerCount };
    }

    await prisma.scholarFollow.create({
      data: { userId, scholarId },
    });

    const followerCount = await prisma.scholarFollow.count({ where: { scholarId } });
    return { following: true, followerCount };
  }
}
