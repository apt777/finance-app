import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Commented out
import "./globals.css";
import Layout from './components/Layout';
import { Providers } from './providers';
import { AuthProvider } from './context/AuthProviderClient'; // Import AuthProviderClient
import { redirect } from 'next/navigation'; // Import redirect

// const geistSans = Geist({ // Commented out
//   variable: "--font-geist-sans", // Commented out
//   subsets: ["latin"], // Commented out
// }); // Commented out

// const geistMono = Geist_Mono({ // Commented out
//   variable: "--font-geist-mono", // Commented out
//   subsets: ["latin"], // Commented out
// }); // Commented out

export const metadata: Metadata = {
  title: "KABLUS",
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
        className={`antialiased`}
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