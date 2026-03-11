import { Link } from 'react-router';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">هنا وادينا</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              البوابة الرقمية الرسمية للوادي الجديد - نربط المجتمع، ندعم الاقتصاد، ونحكي قصة وادينا
              للعالم.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/logistics"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  اللوجستيات والتنقل
                </Link>
              </li>
              <li>
                <Link
                  to="/marketplace"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  البورصة والأسعار
                </Link>
              </li>
              <li>
                <Link
                  to="/investment"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  فرص الاستثمار
                </Link>
              </li>
              <li>
                <Link
                  to="/tourism"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  السياحة والمجتمع
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">تواصل معنا</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                الخارجة، الوادي الجديد، مصر
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                +20 123 456 789
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                info@henawadina.eg
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">تابعنا</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 هنا وادينا. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
