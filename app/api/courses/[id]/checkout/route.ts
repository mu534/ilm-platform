import { NextRequest } from "next/server";
import { requireUserFresh } from "../../../../lib/authorization";
import { PaymentService } from "../../../../lib/services/paymentService";
import { successResponse, handleApiError } from "../../../../utils/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id: courseId } = await params;

    const url = await PaymentService.createCheckoutSession(user.id, courseId);
    return successResponse({ url });
  } catch (error) {
    return handleApiError(error);
  }
}
