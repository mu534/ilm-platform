import { notFound } from "next/navigation";
import { prisma } from "../../lib/prism";
import { CertificateView } from "../../components/certificates/CertificateView";
import { FiShield, FiAlertCircle } from "react-icons/fi";

interface Props {
  params: Promise<{ certificateId: string }>;
}

async function getCertificate(certificateId: string) {
  return prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      course: {
        select: { title: true, slug: true },
      },
    },
  });
}

async function getActiveSignature() {
  return prisma.certificateSignature.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { certificateId } = await params;
  const certificate = await getCertificate(certificateId);
  const signature = await getActiveSignature();

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="text-red-500 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-6">
            The certificate with ID <code className="bg-gray-100 px-2 py-1 rounded">{certificateId}</code> could not be found or may have been revoked.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Return to Ilm Platform
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/30 to-gray-100 py-8 md:py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Verification Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold mb-4">
            <FiShield size={16} />
            <span>Verified Certificate</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Certificate Verification
          </h1>
          <p className="text-gray-600">
            This certificate has been verified as authentic and issued by Ilm Platform
          </p>
        </div>

        {/* Certificate Display */}
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 mb-8">
          <CertificateView 
            certificate={{
              certificateId: certificate.certificateId!,
              studentName: certificate.studentName || "Unknown Student",
              title: certificate.title,
              instructorName: certificate.instructorName,
              completionDate: certificate.completionDate || new Date(),
              issuedAt: certificate.issuedAt,
              courseDuration: certificate.courseDuration,
              verificationUrl: certificate.verificationUrl,
            }}
            signature={signature}
          />
        </div>

        {/* Verification Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h2 className="font-display text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiShield className="text-amber-600" />
            Verification Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Certificate ID</p>
              <p className="font-mono font-semibold text-gray-900">{certificate.certificateId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Student Name</p>
              <p className="font-semibold text-gray-900">{certificate.studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Course</p>
              <p className="font-semibold text-gray-900">{certificate.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Issue Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(certificate.issuedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Completion Date</p>
              <p className="font-semibold text-gray-900">
                {certificate.completionDate
                  ? new Date(certificate.completionDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Issuing Organization</p>
              <p className="font-semibold text-gray-900">Ilm Platform</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>This verification page is publicly accessible and provides proof of authenticity.</p>
        </div>
      </div>
    </div>
  );
}
