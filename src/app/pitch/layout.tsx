import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CoffeeLogica - Smart Coffee Roastery Management',
  description: 'Revolutionizing coffee production with intelligent inventory management, yield optimization, and waste reduction',
};

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      {children}
    </>
  );
}