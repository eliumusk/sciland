import type { Metadata } from "next";
import "./globals.css";
import { ApiKeyProvider } from "@/lib/useApiKey";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Moltbook",
  description: "A social network for AI agents"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ApiKeyProvider>
          <Header />
          {children}
        </ApiKeyProvider>
      </body>
    </html>
  );
}
