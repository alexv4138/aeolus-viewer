import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'Sistem Monitorizare Urban Lentz 2',
  description: 'Telemetrie live, istoric și monitorizare alarme pentru turbine eoliene.',
  openGraph: { title: 'Urban Lentz 2', description: 'Monitor operațional pentru turbine eoliene.', images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: 'Urban Lentz 2', description: 'Monitor operațional pentru turbine eoliene.', images: ['/og.png'] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ro"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>; }
