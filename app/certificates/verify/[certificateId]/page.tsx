import { redirect } from "next/navigation";

/**
 * Non-locale verification URL — redirects to the canonical locale-prefixed route.
 * QR codes and old bookmarks that use /certificates/verify/[id] still work.
 */
interface Props {
  params: Promise<{ certificateId: string }>;
}

export default async function CertificateVerifyRedirect({ params }: Props) {
  const { certificateId } = await params;
  redirect(`/en/verify/${certificateId}`);
}
