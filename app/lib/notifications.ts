import { prisma } from "./prism";
import type { NotificationType } from "../../generated/prisma/enums";

interface NotifyOptions {
  userId:  string;
  type:    NotificationType;
  title:   string;
  message: string;
  link?:   string;
}

/** Create a single notification for one user */
export async function notify(options: NotifyOptions) {
  return prisma.notification.create({ data: options });
}

/** Notify all followers of a scholar when they publish new content */
export async function notifyScholarFollowers(
  scholarId: string,
  type: NotificationType,
  title: string,
  message: string,
  link: string,
) {
  const followers = await prisma.scholarFollow.findMany({
    where: { scholarId },
    select: { userId: true },
  });

  if (followers.length === 0) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.userId,
      type,
      title,
      message,
      link,
    })),
    skipDuplicates: true,
  });
}
