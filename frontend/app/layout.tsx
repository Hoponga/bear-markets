import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(e) {}
})();
`;

const inter = Inter({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UC Berkeley Prediction Markets',
  description: 'Trade on prediction markets at the number one public university in the world',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Navbar />
        <main className="min-h-screen bg-bg-primary flex flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
