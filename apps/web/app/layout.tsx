import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Layout from './components/Layout';
import { Providers } from './providers';
import { AuthProvider } from './context/AuthProviderClient'; // Import AuthProviderClient
import { redirect } from 'next/navigation'; // Import redirect

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Boss",
  description: "Personal Finance Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This is a server component. AuthProviderClient is a client component
  // that provides the authentication context to its children.

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider> {/* Wrap with AuthProviderClient */}
          <Providers>
            <Layout>
              {children}
            </Layout>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}