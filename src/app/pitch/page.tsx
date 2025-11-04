import { Metadata } from 'next';
import PitchDeck from './PitchDeck';

export const metadata: Metadata = {
  title: 'CoffeeLogica - Product Demo & Features',
  description: 'Experience CoffeeLogica - The ultimate coffee roastery management system. See how our platform helps you manage inventory, track batches, and optimize your coffee production process with ease.',
  keywords: [
    'coffee roastery management',
    'coffee production software',
    'roastery inventory system',
    'coffee batch tracking',
    'coffee roastery analytics',
    'coffee business management',
    'roastery operations software',
    'coffee production optimization',
    'roastery management system',
    'coffee business solutions'
  ],
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
    'keywords_id': [
      'sistem manajemen roastery kopi',
      'perangkat lunak produksi kopi',
      'sistem inventaris roastery',
      'pelacakan batch kopi',
      'analitik roastery kopi',
      'manajemen bisnis kopi',
      'perangkat lunak operasional roastery',
      'optimasi produksi kopi',
      'sistem manajemen roastery',
      'solusi bisnis kopi',
      'aplikasi roastery kopi',
      'manajemen kualitas kopi',
      'software roastery'
    ].join(', '),
  },
};

export default function PitchPage() {
  return (
    <div className="pitch-page">
      <PitchDeck />
    </div>
  );
}