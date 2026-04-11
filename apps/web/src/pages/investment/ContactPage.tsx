import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowRight, Building2, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';
import { UserRole } from '@hena-wadeena/types';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';
import { businessesAPI, businessInquiriesAPI, investmentApplicationsAPI } from '@/services/api';
import { useTranslation } from 'react-i18next';

const investorTypes = [
  {
    value: 'individual',
    label: { ar: 'مستثمر فردي', en: 'Individual investor' },
  },
  {
    value: 'company',
    label: { ar: 'شركة', en: 'Company' },
  },
  {
    value: 'fund',
    label: { ar: 'صندوق استثماري', en: 'Investment fund' },
  },
  {
    value: 'government',
    label: { ar: 'مؤسسة حكومية', en: 'Government institution' },
  },
  {
    value: 'other',
    label: { ar: 'أخرى', en: 'Other' },
  },
] as const;

const investmentRanges = [
  {
    value: 'under-1m',
    label: { ar: 'أقل من مليون جنيه', en: 'Less than 1 million EGP' },
  },
  {
    value: '1m-5m',
    label: { ar: '1-5 مليون جنيه', en: '1-5 million EGP' },
  },
  {
    value: '5m-10m',
    label: { ar: '5-10 مليون جنيه', en: '5-10 million EGP' },
  },
  {
    value: '10m-50m',
    label: { ar: '10-50 مليون جنيه', en: '10-50 million EGP' },
  },
  {
    value: '50m-plus',
    label: { ar: 'أكثر من 50 مليون جنيه', en: 'More than 50 million EGP' },
  },
] as const;

const ContactPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading = false, language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const entity = searchParams.get('entity') === 'startup' ? 'startup' : 'opportunity';
  const isStartupFlow = entity === 'startup';
  const canAccessInvestmentContact =
    user?.role === UserRole.INVESTOR || user?.role === UserRole.ADMIN;
  const postSubmitRedirect = user?.role === UserRole.ADMIN ? '/admin' : '/dashboard/investor';

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    investorType: '',
    investmentRange: '',
    amount: '',
    message: '',
  });

  const startupQuery = useQuery({
    queryKey: ['investment', 'startups', 'contact', id],
    queryFn: () => businessesAPI.getById(id!),
    enabled: isStartupFlow && !!id,
  });

  const targetName = useMemo(() => {
    if (!isStartupFlow || !startupQuery.data) return null;

    return (
      pickLocalizedField(appLanguage, {
        ar: startupQuery.data.nameAr,
        en: startupQuery.data.nameEn,
      }) ??
      startupQuery.data.nameAr ??
      startupQuery.data.nameEn ??
      null
    );
  }, [appLanguage, isStartupFlow, startupQuery.data]);

  const investorTypeLabel = useMemo(
    () =>
      new Map<string, string>(
        investorTypes.map((option) => [option.value, pickLocalizedCopy(appLanguage, option.label)]),
      ),
    [appLanguage],
  );

  const investmentRangeLabel = useMemo(
    () =>
      new Map<string, string>(
        investmentRanges.map((option) => [
          option.value,
          pickLocalizedCopy(appLanguage, option.label),
        ]),
      ),
    [appLanguage],
  );

  useEffect(() => {
    if (!user) return;

    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.full_name,
      email: prev.email || user.email,
      phone: prev.phone || user.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      toast.error(
        t('contact.toast.signIn'),
      );
      void navigate('/login');
      return;
    }

    if (user && !canAccessInvestmentContact) {
      toast.error(
        t('contact.toast.investorOnly'),
      );
      void navigate('/investment');
    }
  }, [appLanguage, canAccessInvestmentContact, isAuthenticated, isLoading, navigate, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: isStartupFlow ? 'الشركة غير متاحة حالياً' : 'الفرصة غير متاحة حالياً',
          en: isStartupFlow
            ? 'This startup is not available right now'
            : 'This opportunity is not available right now',
        }),
      );
      return;
    }

    if (!isAuthenticated) {
      toast.error(
        t('contact.toast.signIn'),
      );
      void navigate('/login');
      return;
    }

    if (!canAccessInvestmentContact) {
      toast.error(
        t('contact.toast.investorOnly'),
      );
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error(
        t('contact.toast.fillRequired'),
      );
      return;
    }

    setSubmitting(true);

    try {
      const amountProposed = formData.amount.trim()
        ? parseEgpInputToPiasters(formData.amount)
        : null;

      const enrichedMessage = [
        `${t('listingEditor.nameLabel')}: ${formData.name.trim()}`,
        formData.company.trim()
          ? `${t('contact.types.company')}: ${formData.company.trim()}`
          : null,
        formData.investorType
          ? `${t('contact.form.investorType')}: ${investorTypeLabel.get(formData.investorType)}`
          : null,
        formData.investmentRange
          ? `${t('Investment range')}: ${investmentRangeLabel.get(formData.investmentRange)}`
          : null,
        amountProposed != null
          ? `${t('investor.submitted.table.amount')}: ${(amountProposed / 100).toLocaleString(appLanguage === 'en' ? 'en-US' : 'ar-EG')} ${t('transactions.currency')}`
          : null,
        '',
        formData.message.trim(),
      ]
        .filter((line): line is string => line != null)
        .join('\n');

      if (isStartupFlow) {
        const startup = startupQuery.data;
        if (!startup) {
          throw new Error(
            t('contact.toast.loadError'),
          );
        }

        if (startup.ownerId === user?.id) {
          toast.error(
            t('contact.toast.ownStartup'),
          );
          return;
        }

        await businessInquiriesAPI.submit(id, {
          contactName: formData.name.trim(),
          contactEmail: formData.email.trim(),
          contactPhone: formData.phone.trim() || undefined,
          message: enrichedMessage,
        });

        toast.success(
          t('contact.toast.successStartup'),
        );
        void navigate(postSubmitRedirect);
        return;
      }

      await investmentApplicationsAPI.submitInterest(id, {
        contactEmail: formData.email.trim(),
        contactPhone: formData.phone.trim() || undefined,
        amountProposed: amountProposed ?? undefined,
        message: enrichedMessage,
      });

      toast.success(
        t('contact.toast.successOpportunity'),
      );
      void navigate(postSubmitRedirect);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('listingInquiry.submitError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const introText = isStartupFlow
    ? startupQuery.isLoading
      ? t('contact.intro.loading')
      : targetName
        ? pickLocalizedCopy(appLanguage, {
            ar: `سيتم حفظ طلبك وإرساله مباشرة إلى صاحب الشركة ${targetName}.`,
            en: `Your inquiry will be saved and sent directly to ${targetName}.`,
          })
        : t('contact.intro.startup')
    : t('contact.intro.opportunity');

  return (
    <Layout
      title={t('contact.title')}
    >
      <section className="py-8 md:py-12">
        <div className="container max-w-2xl px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6 gap-2">
            <ArrowRight className="h-4 w-4" />
            {t('bookings.backBtn')}
          </Button>

          <Card className="border-border/50">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {pickLocalizedCopy(appLanguage, {
                  ar: isStartupFlow ? 'تواصل مع شركة ناشئة' : 'تواصل للاستثمار',
                  en: isStartupFlow ? 'Contact a startup' : 'Contact for investment',
                })}
              </CardTitle>
              <p className="text-muted-foreground">{introText}</p>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {t('form.fullName')} *
                    </Label>
                    <div className="relative">
                      <User className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="pe-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      {t('form.phone')}
                    </Label>
                    <div className="relative">
                      <Phone className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {t('contact.form.email')}{' '}
                      *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="pe-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">
                      {t('transport.form.name')}
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, company: event.target.value }))
                        }
                        className="pe-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      {t('contact.form.investorType')}
                    </Label>
                    <Select
                      value={formData.investorType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, investorType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('contact.form.investorTypePlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {investorTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {pickLocalizedCopy(appLanguage, type.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t('contact.form.investmentRange')}
                    </Label>
                    <Select
                      value={formData.investmentRange}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, investmentRange: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('contact.form.investmentRangePlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {investmentRanges.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {pickLocalizedCopy(appLanguage, range.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {t('contact.form.amount')}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, amount: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    {t('contact.form.message')} *
                  </Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={formData.message}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder={pickLocalizedCopy(appLanguage, {
                      ar: isStartupFlow
                        ? 'اشرح نوع الشراكة أو الاستثمار الذي ترغب في مناقشته مع هذه الشركة...'
                        : 'اشرح اهتمامك بالفرصة أو طبيعة الشراكة التي تبحث عنها...',
                      en: isStartupFlow
                        ? 'Describe the partnership or investment you want to discuss with this startup...'
                        : 'Describe your interest in this opportunity or the kind of partnership you are seeking...',
                    })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  <Send className="ms-2 h-5 w-5" />
                  {submitting
                    ? t('listingInquiry.button.submitting')
                    : t('contact.form.sendBtn')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
