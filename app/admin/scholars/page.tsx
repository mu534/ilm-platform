import { redirect } from "next/navigation";

export default function LegacyAdminScholarsRedirect() {
  redirect("/admin/instructors");
}
