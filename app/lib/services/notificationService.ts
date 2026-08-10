import { prisma } from "../prism";
import { NotificationType } from "../../../generated/prisma/enums";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export class NotificationService {
  static async sendNotification(input: CreateNotificationInput) {
    const { userId, type, title, message, link } = input;

    // Transactional notifications are always delivered
    const isTransactional = (
      [
        NotificationType.COURSE_APPROVED,
        NotificationType.COURSE_REJECTED,
        NotificationType.QUIZ_RESULT,
        NotificationType.CERTIFICATE_ISSUED,
      ] as NotificationType[]
    ).includes(type);

    if (!isTransactional) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notifyNewContent: true, notifyComments: true },
      });

      if (user) {
        if (
          (type === NotificationType.NEW_LECTURE || type === NotificationType.NEW_COURSE) &&
          !user.notifyNewContent
        ) {
          return null;
        }

        if (type === NotificationType.COMMENT_REPLY && !user.notifyComments) {
          return null;
        }
      }
    }

    return prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    });
  }
}
