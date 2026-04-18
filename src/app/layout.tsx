import "./globals.css";
import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "CareerOps",
  description: "Your AI-powered job search co-pilot",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="min-h-screen">
        {session.loggedIn && <NavBar />}
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
