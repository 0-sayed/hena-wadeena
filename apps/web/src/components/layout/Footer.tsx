import { Link } from 'react-router';
import { Phone, Mail, Facebook, Instagram, MapPin, Youtube } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { XIcon } from '@/components/icons/XIcon';

const quickLinks = [
  { href: '/tourism', labelKey: 'footer.link.tourism' },
  { href: '/tourism/accommodation', labelKey: 'footer.link.accommodation' },
  { href: '/guides', labelKey: 'footer.link.guides' },
  { href: '/marketplace', labelKey: 'footer.link.marketplace' },
  { href: '/logistics', labelKey: 'footer.link.logistics' },
  { href: '/investment', labelKey: 'footer.link.investment' },
] as const;

export function Footer() {
  const { t } = useTranslation('layout');

  return (
    <footer className="bg-card border-t border-border">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/icon-source.png" alt={t('footer.brandName')} className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-bold text-foreground">{t('footer.brandName')}</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('footer.description')}</p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t('footer.contact')}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {t('footer.location')}
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                01011559999
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                info@hena-wadeena.online
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t('footer.followUs')}</h4>
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
          <p>{t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
