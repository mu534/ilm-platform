import { prisma } from "./prism";
import type { NotificationType } from "../../generated/prisma/enums";

interface NotifyOptions {
  userId:  string;
  type:    NotificationType;
  title:   string;
  message: string;
  link?:   string;
}

// Notification types users can mute from Settings. Transactional types
// (course approval, quiz results, certificates, new followers) are always
// sent — same principle as not being able to turn off "your order shipped".
// COURSE_ANNOUNCEMENT is gated behind notifyNewContent (same as NEW_LECTURE).
const MUTABLE_TYPES = new Set<NotificationType>(["NEW_LECTURE", "NEW_COURSE", "COMMENT_REPLY", "COURSE_ANNOUNCEMENT"]);

function prefFieldFor(type: NotificationType): "notifyNewContent" | "notifyComments" | null {
  if (type === "NEW_LECTURE" || type === "NEW_COURSE" || type === "COURSE_ANNOUNCEMENT") return "notifyNewContent";
  if (type === "COMMENT_REPLY") return "notifyComments";
  return null;
}

async function isMuted(userId: string, type: NotificationType): Promise<boolean> {
  if (!MUTABLE_TYPES.has(type)) return false;
  const field = prefFieldFor(type);
  if (!field) return false;

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { notifyNewContent: true, notifyComments: true },
  });
  if (!user) return false;

  return field === "notifyNewContent" ? user.notifyNewContent === false : user.notifyComments === false;
}

/** Create a single notification for one user, respecting their preferences */
export async function notify(options: NotifyOptions) {
  if (await isMuted(options.userId, options.type)) return null;
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
    select: { userId: true, user: { select: { notifyNewContent: true } } },
  });

  // Respect each follower's preference individually rather than an
  // all-or-nothing send.
  const recipients = MUTABLE_TYPES.has(type)
    ? followers.filter((f) => f.user.notifyNewContent !== false)
    : followers;

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((f) => ({
      userId: f.userId,
      type,
      title,
      message,
      link,
    })),
    skipDuplicates: true,
  });
}
