export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Locale routing is handled by proxy.ts. This layout also wraps locale
  // routes, so redirecting here would redirect /en back to itself indefinitely.
  return children;
}
