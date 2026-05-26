import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'SocialFlow AI — Social Media Content from Any URL',
  description:
    'AI-powered SaaS that turns website content into platform-optimized social posts using Firecrawl and n8n.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="dark">
        <body>
          <ThemeProvider>
            <Header />
            <main>{children}</main>
            <Toaster richColors position="top-right" theme="system" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
