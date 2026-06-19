import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "தாய் நிலம் AGRO",
  description: "நிலமே தாய், விளைவே வாழ்வு",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ta">
      <body className={`${geist.className} min-h-screen bg-green-50`}>
        {children}
      </body>
    </html>
  );
}