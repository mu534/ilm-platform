// Server component — reads admin email from environment and passes to client form

import { ContactForm } from "./ContactForm";

export const metadata = {
  title: "Contact Us | Ilm Platform",
  description: "Get in touch with the Ilm Platform team.",
};

export default function ContactPage() {
  // Read from env server-side — never exposed as NEXT_PUBLIC_
  const adminEmail =
    process.env.ADMIN_EMAIL ??
    process.env.EMAIL_FROM ??
    "ilmplatform6@gmail.com";

  return <ContactForm adminEmail={adminEmail} />;
}
