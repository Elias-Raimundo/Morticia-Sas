import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/Auth.context";
import {Toaster} from "sonner";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Morticia-SAS",
  description: "Sistema de pedidos",
  manifest: "/manifest.json",
  icons:{
    icon: "/loguito.png",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ConfirmProvider>
            {children}
            <Toaster richColors position="top-center" />
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
