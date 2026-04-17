import { MessageCircle } from 'lucide-react';

import { Button } from '../ui/button';

interface WhatsAppButtonProps {
  whatsappNumber: string;
  productName: string;
  className?: string;
}

export function WhatsAppButton({ whatsappNumber, productName, className }: WhatsAppButtonProps) {
  const cleanNumber = whatsappNumber.replace(/\D/g, '');
  const message = encodeURIComponent(`مرحبا، أرغب في الاستفسار عن ${productName}`);
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`;

  return (
    <Button asChild className={className} size="lg">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="ml-2 h-5 w-5" />
        تواصل عبر واتساب
      </a>
    </Button>
  );
}
