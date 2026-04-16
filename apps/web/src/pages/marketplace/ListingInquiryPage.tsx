import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { useListing } from '@/hooks/use-listings';
import { usePublicUsers } from '@/hooks/use-users';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { listingInquiriesAPI } from '@/services/api';
import { useTranslation } from 'react-i18next';

export default function ListingInquiryPage() {
  const { t } = useTranslation('marketplace');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: listing, isLoading } = useListing(id);
  const ownerQuery = usePublicUsers(listing ? [listing.ownerId] : []);
  const hasAutoFilled = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  useEffect(() => {
    if (!user || hasAutoFilled.current) return;
    hasAutoFilled.current = true;
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.full_name,
      email: prev.email || user.email,
      phone: prev.phone || user.phone || '',
    }));
  }, [user]);

  if (isLoading) {
    return (
      <Layout title={t('listingInquiry.title')}>
        <div className="container space-y-6 px-4 py-10">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout title={t('listingInquiry.title')}>
        <div className="container space-y-4 px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">{t('listingInquiry.loadError')}</p>
          <Button onClick={() => void navigate('/marketplace')}>
            {t('listingInquiry.backToMarket')}
          </Button>
        </div>
      </Layout>
    );
  }

  const owner = ownerQuery.data?.[listing.ownerId];
  const isOwner = user?.id === listing.ownerId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isOwner) {
      toast.error(t('listingInquiry.isOwnerError'));
      return;
    }

    if (!id) {
      toast.error(t('listingInquiry.idMissingError'));
      return;
    }

    if (!formData.name.trim() || !formData.message.trim()) {
      toast.error(t('listingInquiry.validationError'));
      return;
    }

    setSubmitting(true);
    try {
      const inquiry = await listingInquiriesAPI.submit(id, {
        contactName: formData.name.trim(),
        contactEmail: formData.email.trim() || undefined,
        contactPhone: formData.phone.trim() || undefined,
        message: formData.message.trim(),
      });

      toast.success(t('listingInquiry.submitSuccess'));
      void navigate(`/marketplace/inquiries?tab=sent&focus=${inquiry.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('listingInquiry.submitError');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title={t('listingInquiry.title')}>
      <section className="py-8 md:py-12">
        <div className="container max-w-2xl px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {t('listingInquiry.back')}
          </Button>

          <Card className="border-border/50">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('listingInquiry.cardTitle')}</CardTitle>
              <p className="text-muted-foreground">
                {owner
                  ? t('listingInquiry.cardDescription', {
                      title: listing.titleAr,
                      owner: owner.full_name,
                    })
                  : t('listingInquiry.cardDescriptionNoOwner', { title: listing.titleAr })}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form
                onSubmit={(event) => {
                  void handleSubmit(event);
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="listingInquiryName">{t('listingInquiry.form.name')}</Label>
                  <div className="relative">
                    <User className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="listingInquiryName"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="pe-10"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="listingInquiryEmail">{t('listingInquiry.form.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="listingInquiryEmail"
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="pe-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="listingInquiryPhone">{t('listingInquiry.form.phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="listingInquiryPhone"
                        type="tel"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="pe-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listingInquiryMessage">{t('listingInquiry.form.message')}</Label>
                  <Textarea
                    id="listingInquiryMessage"
                    rows={6}
                    value={formData.message}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder={t('listingInquiry.form.messagePlaceholder')}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting || isOwner}>
                  <Send className="h-5 w-5" />
                  {submitting
                    ? t('listingInquiry.button.submitting')
                    : t('listingInquiry.button.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
