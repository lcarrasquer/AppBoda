import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: "AppBoda | Tu Evento de Boda Interactivo",
    template: "%s | AppBoda",
  },
  description: "Plataforma interactiva para bodas. Comparte fotos, retos, libro de visitas y juegos de trivia el día de tu boda.",
  icons: {
    icon: [
      { url: '/app-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/app-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/app-logo.png',
    apple: '/app-logo.png',
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
