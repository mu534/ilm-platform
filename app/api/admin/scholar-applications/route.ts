import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin } from "../../../lib/authorization";
import { successResponse, handleApiError } from "../../../utils/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(); const { searchParams } = new URL(req.url); const status = searchParams.get("status"); const q = searchParams.get("q")?.trim(); const page = Math.max(1, Number(searchParams.get("page") || 1)); const take = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const where = { ...(status ? { status: status as never } : {}), ...(q ? { user: { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } } : {}) };
    const [items, total] = await prisma.$transaction([prisma.scholarApplication.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * take, take, include: { user: { select: { id: true, name: true, email: true, image: true, country: true } }, reviewedBy: { select: { name: true } }, categories: { include: { category: { select: { name: true } } } }, documents: { select: { id: true, originalName: true, kind: true } }, reviewHistory: { orderBy: { createdAt: "desc" }, include: { reviewer: { select: { name: true } } } } } }), prisma.scholarApplication.count({ where })]);
    return successResponse({ items, total, page, limit: take });
  } catch (error) { return handleApiError(error); }
}
