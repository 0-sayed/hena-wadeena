import { useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  Users,
  MessageSquare,
  Send,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserRole } from '@hena-wadeena/types';
import { useAuth } from '@/hooks/use-auth';
import { useListing } from '@/hooks/use-listings';
import { listingInquiriesAPI } from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '@/lib/localization';

const tenantTypesKeys = [
  'inquiry.tenantTypes.student',
  'inquiry.tenantTypes.govEmployee',
  'inquiry.tenantTypes.privateEmployee',
  'inquiry.tenantTypes.family',
  'inquiry.tenantTypes.other',
];

const AccommodationInquiryPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('accommodation');
  const { id } = useParams<{ id: string }>();
  const { user, language } = useAuth();
  const appLanguage = language as AppLanguage;
  const { data: listing } = useListing(id);
  const hasAutoFilled = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tenantType: '',
    moveInDate: '',
    duration: '',
    occupants: '1',
    isStudent: false,
    university: '',
    message: '',
  });

  useEffect(() => {
    if (!user || hasAutoFilled.current) return;
    hasAutoFilled.current = true;
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.full_name,
      phone: prev.phone || user.phone || '',
      email: prev.email || user.email,
      isStudent: user.role === UserRole.STUDENT,
    }));
  }, [user]);

  const inquiryMessage = useMemo(() => {
    const details = [
      `${t('inquiry.messageContext.name')}: ${formData.name}`,
      `${t('inquiry.messageContext.phone')}: ${formData.phone}`,
      formData.email ? `${t('inquiry.messageContext.email')}: ${formData.email}` : null,
      `${t('inquiry.messageContext.tenantType')}: ${formData.tenantType}`,
      formData.moveInDate ? `${t('inquiry.messageContext.moveIn')}: ${formData.moveInDate}` : null,
      formData.duration ? `${t('inquiry.messageContext.duration')}: ${formData.duration}` : null,
      `${t('inquiry.messageContext.occupants')}: ${formData.occupants}`,
      formData.isStudent ? t('inquiry.messageContext.isStudent') : null,
      formData.university ? `${t('inquiry.messageContext.university')}: ${formData.university}` : null,
      formData.message ? `${t('inquiry.messageContext.extra')}: ${formData.message}` : null,
    ].filter(Boolean);

    return `${t('inquiry.messageContext.heading')} ${(appLanguage === 'en' ? listing?.titleEn : listing?.titleAr) ?? listing?.titleAr ?? '' ?? ''}\n\n${details.join('\n')}`;
  }, [formData, listing?.titleAr, listing?.titleEn, appLanguage, t]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim() || !formData.tenantType) {
      toast.error(t('inquiry.toast.missingFields'));
      return;
    }

    if (!id) {
      toast.error(t('inquiry.toast.noListing'));
      return;
    }

    if (!user) {
      toast.error(t('inquiry.toast.loginRequired'));
      void navigate('/login');
      return;
    }

    if (listing?.ownerId === user.id) {
      toast.error(t('inquiry.toast.ownListing'));
      return;
    }

    setSubmitting(true);
    try {
      const inquiry = await listingInquiriesAPI.submit(id, {
        contactName: formData.name.trim(),
        contactEmail: formData.email.trim() || undefined,
        contactPhone: formData.phone.trim() || undefined,
        message: inquiryMessage,
      });

      toast.success(t('inquiry.toast.success'));
      void navigate(`/marketplace/inquiries?tab=sent&focus=${inquiry.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('inquiry.toast.failure');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title={t('inquiry.pageTitle')}>
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6 gap-2">
            <ArrowRight className="h-4 w-4" />
            {t('inquiry.back')}
          </Button>

          <Card className="border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('inquiry.cardTitle')}</CardTitle>
              <p className="text-muted-foreground">
                {t('inquiry.cardSubtitle')}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form
                onSubmit={(event) => {
                  void handleSubmit(event);
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('inquiry.formName')}</Label>
                    <div className="relative">
                      <User className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder={t('inquiry.formNamePlaceholder')}
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
                    <Label htmlFor="phone">{t('inquiry.formPhone')}</Label>
                    <div className="relative">
                      <Phone className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="pe-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('inquiry.formEmail')}</Label>
                  <div className="relative">
                    <Mail className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="pe-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('inquiry.formTenantType')}</Label>
                  <Select
                    value={formData.tenantType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, tenantType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('inquiry.formTenantTypeSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantTypesKeys.map((key) => (
                        <SelectItem key={key} value={t(key)}>
                          {t(key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isStudent"
                    checked={formData.isStudent}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isStudent: checked === true }))
                    }
                  />
                  <Label htmlFor="isStudent" className="flex cursor-pointer items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    {t('inquiry.studentCheckbox')}
                  </Label>
                </div>

                {formData.isStudent && (
                  <div className="space-y-2">
                    <Label htmlFor="university">{t('inquiry.universityLabel')}</Label>
                    <Input
                      id="university"
                      placeholder={t('inquiry.universityPlaceholder')}
                      value={formData.university}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, university: event.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate">{t('inquiry.moveInDate')}</Label>
                    <div className="relative">
                      <Calendar className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="moveInDate"
                        type="date"
                        value={formData.moveInDate}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, moveInDate: event.target.value }))
                        }
                        className="pe-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('inquiry.duration')}</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, duration: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('inquiry.durationSelect')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={t('inquiry.durations.1to3')}>{t('inquiry.durations.1to3')}</SelectItem>
                        <SelectItem value={t('inquiry.durations.3to6')}>{t('inquiry.durations.3to6')}</SelectItem>
                        <SelectItem value={t('inquiry.durations.6to12')}>{t('inquiry.durations.6to12')}</SelectItem>
                        <SelectItem value={t('inquiry.durations.moreThanYear')}>{t('inquiry.durations.moreThanYear')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupants">{t('inquiry.occupantsLabel')}</Label>
                  <div className="relative">
                    <Users className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="occupants"
                      type="number"
                      min="1"
                      value={formData.occupants}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, occupants: event.target.value }))
                      }
                      className="pe-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t('inquiry.messageLabel')}</Label>
                  <Textarea
                    id="message"
                    placeholder={t('inquiry.messagePlaceholder')}
                    value={formData.message}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, message: event.target.value }))
                    }
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  <Send className="h-5 w-5 ms-2" />
                  {submitting ? t('inquiry.submittingBtn') : t('inquiry.submitBtn')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default AccommodationInquiryPage;
