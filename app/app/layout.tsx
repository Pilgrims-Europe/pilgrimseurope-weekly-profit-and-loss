import { AppHeader } from '@/components/app-header';
import { QueryProvider } from '@/components/query-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { APP_TITLE, LOGO_SRC } from '@/lib/constants';
import type { Metadata } from 'next';
import type React from 'react';
import { Suspense } from 'react';
import './globals.css';

// Sets the dark class before first paint so dark mode never flashes light.
// Keep in sync with components/theme-provider.tsx (localStorage key "theme").
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${APP_TITLE} · Pilgrim's Europe`,
  description:
    'Weekly P&L for the pilot sites, built from Snowflake, with the RAG status and rule of each Anaplan template line.',
  icons: { icon: LOGO_SRC },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <QueryProvider>
            <Suspense>
              <AppHeader />
            </Suspense>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
