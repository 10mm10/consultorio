import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ms Serviços Médicos",
  description: "Serviços Médicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-gray-50/50 text-gray-800 overflow-x-hidden">
        
        {/* 🌟 Balão de Fundo Maior e Alongado */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Balão superior direito maior e alongado */}
          <div className="absolute -top-32 -right-32 w-[700px] h-[700px] bg-blue-100/60 rounded-full rotate-12" />
          
          {/* Balão inferior esquerdo */}
          <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-blue-50/80 rounded-full -rotate-12" />
        </div>

        {/* Conteúdo das páginas */}
        <div className="relative z-10 min-h-full flex flex-col flex-1">
          {children}
        </div>

        {/* 🚀 Notificações Profissionais (Sonner) */}
        <Toaster richColors position="top-center" />

      </body>
    </html>
  );
}