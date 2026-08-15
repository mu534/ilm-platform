import { redirect } from "next/navigation";

/**
 * Legacy verify URL — redirects to the canonical rich verification page.
 * QR codes and old links still work.
 */
interface Props {
  params: Promise<{ certId: string }>;
}

export default async function VerifyCertificateRedirect({ params }: Props) {
  const { certId } = await params;
  redirect(`/certificates/verify/${certId}`);
}
