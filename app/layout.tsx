import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'Aeolus Grid — turbine monitoring',
  description: 'Live wind turbine telemetry, history and alarm monitoring.',
  openGraph: { title: 'Aeolus Grid', description: 'Wind turbine operations monitor.', images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: 'Aeolus Grid', description: 'Wind turbine operations monitor.', images: ['/og.png'] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>; }
