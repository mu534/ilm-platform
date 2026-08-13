import PublicCertificateVerificationPage from "../../../certificates/verify/[certificateId]/page";

interface Props {
  params: Promise<{ certificateId: string }>;
}

export default async function CertificateVerificationPage({ params }: Props) {
  return <PublicCertificateVerificationPage params={params} />;
}
