import { prisma } from "../prism";
import { HttpError } from "../httpError";
import type { SessionUser } from "../../types/auth.types";
import { ReportReason, ReportStatus } from "../../../generated/prisma/enums";

export interface CreateReportInput {
  reason: ReportReason;
  description?: string;
  commentId?: string;
  forumQuestionId?: string;
  forumReplyId?: string;
  courseId?: string;
}

export interface ForumVoteInput {
  value: number; // +1 or -1
  questionId?: string;
  replyId?: string;
}

export class ModerationService {
  /**
   * Submit a content report.
   * Enforces at least one target is provided.
   */
  static async createReport(user: SessionUser, input: CreateReportInput) {
    const { reason, description, commentId, forumQuestionId, forumReplyId, courseId } = input;

    const targetCount = [commentId, forumQuestionId, forumReplyId, courseId].filter(Boolean).length;
    if (targetCount === 0) {
      throw new HttpError("At least one target (comment, question, reply, or course) must be specified", 400);
    }

    return prisma.report.create({
      data: {
        reportedById: user.id,
        reason,
        description,
        commentId,
        forumQuestionId,
        forumReplyId,
        courseId,
        status: ReportStatus.PENDING,
      },
    });
  }

  /**
   * Cast a vote on a forum question or reply.
   * Enforces strict XOR: target must be either questionId OR replyId, not both and not neither.
   */
  static async castForumVote(user: SessionUser, input: ForumVoteInput) {
    const { value, questionId, replyId } = input;

    if (value !== 1 && value !== -1) {
      throw new HttpError("Vote value must be +1 or -1", 400);
    }

    const hasQuestion = Boolean(questionId);
    const hasReply = Boolean(replyId);

    if ((hasQuestion && hasReply) || (!hasQuestion && !hasReply)) {
      throw new HttpError("Exactly one target (questionId XOR replyId) must be specified for a vote", 400);
    }

    if (hasQuestion && questionId) {
      const existing = await prisma.forumVote.findUnique({
        where: { userId_questionId: { userId: user.id, questionId } },
      });

      if (existing) {
        if (existing.value === value) {
          await prisma.forumVote.delete({ where: { id: existing.id } });
          return { voted: false, value: 0 };
        }
        const updated = await prisma.forumVote.update({
          where: { id: existing.id },
          data: { value },
        });
        return { voted: true, value: updated.value };
      }

      const created = await prisma.forumVote.create({
        data: { userId: user.id, questionId, value },
      });
      return { voted: true, value: created.value };
    }

    if (hasReply && replyId) {
      const existing = await prisma.forumVote.findUnique({
        where: { userId_replyId: { userId: user.id, replyId } },
      });

      if (existing) {
        if (existing.value === value) {
          await prisma.forumVote.delete({ where: { id: existing.id } });
          return { voted: false, value: 0 };
        }
        const updated = await prisma.forumVote.update({
          where: { id: existing.id },
          data: { value },
        });
        return { voted: true, value: updated.value };
      }

      const created = await prisma.forumVote.create({
        data: { userId: user.id, replyId, value },
      });
      return { voted: true, value: created.value };
    }

    throw new HttpError("Invalid vote target", 400);
  }
}
