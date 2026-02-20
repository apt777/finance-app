import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from "next";
import "../globals.css";
import Layout from '@/components/Layout';
import { Providers } from '@/providers';
import { AuthProvider } from '@/context/AuthProviderClient';

export const metadata: Metadata = {
  title: "KABLUS",
  description: "Personal Finance Application",
};

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const { locale } = await params;
  const messages = await getMessages({locale});

  return (
    <html lang={locale}>
      <body className={`antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Providers>
              <Layout>
                {children}
              </Layout>
            </Providers>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
