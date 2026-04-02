import { Link } from 'react-router';
import { Phone, Mail, Facebook, Instagram, MapPin, Youtube } from 'lucide-react';

import { XIcon } from '@/components/icons/XIcon';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';

const quickLinks = [
  {
    href: '/logistics',
    label: { ar: 'اللوجستيات والتنقل', en: 'Logistics & mobility' },
  },
  {
    href: '/marketplace',
    label: { ar: 'البورصة والأسعار', en: 'Marketplace & prices' },
  },
  {
    href: '/investment',
    label: { ar: 'فرص الاستثمار', en: 'Investment opportunities' },
  },
  {
    href: '/tourism',
    label: { ar: 'السياحة والمجتمع', en: 'Tourism & community' },
  },
] as const;

export function Footer() {
  const { language } = useAuth();
  const copy =
    language === 'en'
      ? {
          brandName: 'Hena Wadeena',
          description:
            'Official digital gateway for New Valley. We connect the community, support the local economy, and share the story of the oasis with the world.',
          quickLinks: 'Quick links',
          contact: 'Contact us',
          location: 'Kharga, New Valley, Egypt',
          followUs: 'Follow us',
          rights: '© 2026 Hena Wadeena. All rights reserved.',
        }
      : {
          brandName: 'هُنَا وَادِينَا',
          description:
            'البوابة الرقمية الرسمية للوادي الجديد - نربط المجتمع، ندعم الاقتصاد، ونحكي قصة وادينا للعالم.',
          quickLinks: 'روابط سريعة',
          contact: 'تواصل معنا',
          location: 'الخارجة، الوادي الجديد، مصر',
          followUs: 'تابعنا',
          rights: '© 2026 هُنَا وَادِينَا. جميع الحقوق محفوظة.',
        };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/icon-source.png" alt={copy.brandName} className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-bold text-foreground">{copy.brandName}</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">{copy.quickLinks}</h4>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {pickLocalizedCopy(language, link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">{copy.contact}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {copy.location}
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                +20 123 456 789
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                info@hena-wadeena.online
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">{copy.followUs}</h4>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61576495808108"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-[#1877F2] hover:text-white"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/hena_wadeena"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-black hover:text-white"
              >
                <XIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/henawadeena"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-[#E4405F] hover:text-white"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/@henawadeena"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-[#FF0000] hover:text-white"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>{copy.rights}</p>
        </div>
      </div>
    </footer>
  );
}
