import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from "next";
import localFont from 'next/font/local';
import "../globals.css";
import Layout from '@/components/Layout';
import { Providers } from '@/providers';
import { AuthProvider } from '@/context/AuthProviderClient';
import { ColorModeProvider } from '@/context/ColorModeContext';
import { CurrencyPreferenceProvider } from '@/context/CurrencyPreferenceContext';
import { UiThemeProvider } from '@/context/UiThemeContext';

const appSans = localFont({
  src: '../fonts/Pretendard-SemiBold.otf',
  variable: '--font-app-sans',
  weight: '600',
  display: 'swap',
});

const mono = localFont({
  src: '../../../docs/app/fonts/GeistMonoVF.woff',
  variable: '--font-app-mono',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "KABLUS",
  description: "Personal Finance Application",
  icons: {
    icon: [
      { url: '/icon.png?v=3', type: 'image/png' },
      { url: '/icon.svg?v=3', type: 'image/svg+xml' },
    ],
    shortcut: ['/icon.png?v=3'],
    apple: ['/apple-icon.png?v=3'],
  },
};

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages({locale});

  return (
    <html lang={locale}>
      <body className={`${appSans.variable} ${mono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ColorModeProvider>
              <CurrencyPreferenceProvider>
                <UiThemeProvider>
                  <Providers>
                    <Layout>
                      {children}
                    </Layout>
                  </Providers>
                </UiThemeProvider>
              </CurrencyPreferenceProvider>
            </ColorModeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
