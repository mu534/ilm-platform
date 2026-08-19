"use client";

import { useEffect } from "react";

/**
 * Sets the `dir` and `lang` attributes on <html> at runtime.
 * Called from the [locale]/layout so the root <html> reflects
 * the active locale — essential for Arabic RTL rendering.
 */
export function HtmlDirSetter({ locale, dir }: { locale: string; dir: "ltr" | "rtl" }) {
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", locale);
    html.setAttribute("dir", dir);
    // RTL body class for Tailwind logical-property utilities
    if (dir === "rtl") {
      html.classList.add("rtl");
      document.body.classList.add("rtl");
    } else {
      html.classList.remove("rtl");
      document.body.classList.remove("rtl");
    }
  }, [locale, dir]);

  return null;
}
