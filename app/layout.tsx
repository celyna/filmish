import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "filmish. — Fujifilm Recipe Finder",
  description: "Find an in-camera Fujifilm recipe from an inspiration photograph.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
