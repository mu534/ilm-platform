import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

export default function LegacyScholarStudentsRedirect() {
  redirect(`/${defaultLocale}/dashboard/instructor/students`);
}
