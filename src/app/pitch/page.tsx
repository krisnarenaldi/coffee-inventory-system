import { Metadata } from 'next';
import PitchDeck from './PitchDeck';

export const metadata: Metadata = {
  title: 'CoffeeLogica - Product Demo & Features',
  description: 'Experience CoffeeLogica - The ultimate coffee roastery management system. See how our platform helps you manage inventory, track batches, and optimize your coffee production process with ease.',
  alternates: {
    canonical: 'https://coffeelogica.com/pitch',
    languages: {
      'en': '/pitch',
      'id': '/id/pitch',
    },
  },
  openGraph: {
    title: 'CoffeeLogica - Product Demo & Features',
    description: 'Experience CoffeeLogica - The ultimate coffee roastery management system. See how our platform helps you manage inventory, track batches, and optimize your coffee production process with ease.',
    type: 'website',
    locale: 'en_US',
    url: 'https://coffeelogica.com/pitch',
    siteName: 'CoffeeLogica',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoffeeLogica - Product Demo & Features',
    description: 'Experience the future of coffee roastery management with CoffeeLogica. Streamline your operations and boost productivity.',
  },
  other: {
    'description_id': 'Jelajahi CoffeeLogica - Platform manajemen roastery kopi terdepan. Lihat bagaimana sistem kami membantu mengelola inventaris, melacak produksi, dan mengoptimalkan proses pemanggangan kopi Anda dengan mudah.',
  },
};

export default function PitchPage() {
  return (
    <div className="pitch-page">
      <PitchDeck />
    </div>
  );
}