import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { User, Mail, Phone, Globe, Edit2, Camera, Shield } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LtrText } from '@/components/ui/ltr-text';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authAPI } from '@/services/api';
import type { AuthUser } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';

type ProfileFormState = {
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string;
  language: 'ar' | 'en';
};

type ProfileErrors = Partial<Record<keyof ProfileFormState, string>>;

const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const roleLabels: Record<string, { ar: string; en: string }> = {
  admin: { ar: 'مدير', en: 'Admin' },
  tourist: { ar: 'سائح', en: 'Tourist' },
  investor: { ar: 'مستثمر', en: 'Investor' },
  merchant: { ar: 'تاجر', en: 'Merchant' },
  guide: { ar: 'مرشد سياحي', en: 'Tour guide' },
  student: { ar: 'طالب', en: 'Student' },
  driver: { ar: 'سائق', en: 'Driver' },
  resident: { ar: 'مقيم', en: 'Resident' },
  moderator: { ar: 'منسق', en: 'Moderator' },
  reviewer: { ar: 'مراجع', en: 'Reviewer' },
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  active: { ar: 'نشط', en: 'Active' },
  suspended: { ar: 'معلّق', en: 'Suspended' },
  inactive: { ar: 'غير نشط', en: 'Inactive' },
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  pending_kyc: { ar: 'بانتظار التحقق', en: 'Pending KYC' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
};

const interfaceLanguageLabels: Record<'ar' | 'en', { ar: string; en: string }> = {
  ar: { ar: 'العربية', en: 'Arabic' },
  en: { ar: 'English', en: 'English' },
};

function buildFormState(user: AuthUser): ProfileFormState {
  return {
    full_name: user.full_name,
    phone: user.phone ?? '',
    email: user.email,
    avatar_url: user.avatar_url ?? '',
    language: user.language === 'en' ? 'en' : 'ar',
  };
}

function getRoleLabel(role: string, language: AppLanguage): string {
  const labels = roleLabels[role];
  return labels ? pickLocalizedCopy(language, labels) : role;
}

function getStatusLabel(status: string, language: AppLanguage): string {
  const labels = statusLabels[status];
  return labels ? pickLocalizedCopy(language, labels) : status;
}

function getInterfaceLanguageLabel(value: 'ar' | 'en', language: AppLanguage): string {
  return pickLocalizedCopy(language, interfaceLanguageLabels[value]);
}

function validateProfileForm(formData: ProfileFormState, language: AppLanguage): ProfileErrors {
  const errors: ProfileErrors = {};

  if (!formData.full_name.trim()) {
    errors.full_name = pickLocalizedCopy(language, {
      ar: 'الاسم الكامل مطلوب',
      en: 'Full name is required',
    });
  } else if (formData.full_name.trim().length < 3) {
    errors.full_name = pickLocalizedCopy(language, {
      ar: 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل',
      en: 'Full name must be at least 3 characters',
    });
  }

  if (!formData.email.trim()) {
    errors.email = pickLocalizedCopy(language, {
      ar: 'البريد الإلكتروني مطلوب',
      en: 'Email is required',
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(formData.email.trim())) {
    errors.email = pickLocalizedCopy(language, {
      ar: 'أدخل بريدًا إلكترونيًا صحيحًا',
      en: 'Enter a valid email address',
    });
  }

  if (formData.phone.trim() && !PHONE_REGEX.test(formData.phone.trim())) {
    errors.phone = pickLocalizedCopy(language, {
      ar: 'أدخل رقم هاتف صحيحًا',
      en: 'Enter a valid phone number',
    });
  }

  return errors;
}

function readFileAsDataUrl(file: File, errorMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }

      reject(new Error(errorMessage));
    };
    reader.onerror = () => reject(new Error(errorMessage));
    reader.readAsDataURL(file);
  });
}

const ProfilePage = () => {
  const { user, isLoading, updateUser, language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormState>({
    full_name: '',
    phone: '',
    email: '',
    avatar_url: '',
    language: 'ar',
  });
  const [errors, setErrors] = useState<ProfileErrors>({});

  useEffect(() => {
    if (!user) return;
    setFormData(buildFormState(user));
    setErrors({});
  }, [user]);

  const handleSave = async () => {
    const validationErrors = validateProfileForm(formData, appLanguage);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const updatedUser = await authAPI.updateMe({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        avatar_url: formData.avatar_url || undefined,
        language: formData.language,
      });

      updateUser(updatedUser);
      setEditing(false);
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم تحديث الملف الشخصي بنجاح',
          en: 'Profile updated successfully',
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر تحديث الملف الشخصي',
              en: 'Unable to update the profile',
            });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اختر صورة بصيغة JPG أو PNG أو WebP',
          en: 'Choose a JPG, PNG, or WebP image',
        }),
      );
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت',
          en: 'Image size must not exceed 5 MB',
        }),
      );
      event.target.value = '';
      return;
    }

    try {
      const avatarUrl = await readFileAsDataUrl(
        file,
        pickLocalizedCopy(appLanguage, {
          ar: 'تعذر قراءة الصورة',
          en: 'Unable to read the image',
        }),
      );

      setFormData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      setEditing(true);
      setErrors((prev) => ({ ...prev, avatar_url: undefined }));
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم تجهيز الصورة. احفظ التغييرات لتحديث الملف الشخصي',
          en: 'Image is ready. Save the changes to update your profile',
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر قراءة الصورة',
              en: 'Unable to read the image',
            });
      toast.error(message);
    } finally {
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-2xl space-y-6 py-20">
          <Skeleton h="h-64" className="rounded-2xl" />
          <Skeleton h="h-48" className="rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container max-w-2xl py-20 text-center text-muted-foreground">
          {pickLocalizedCopy(appLanguage, {
            ar: 'لا يمكن تحميل الملف الشخصي حاليًا.',
            en: 'The profile cannot be loaded right now.',
          })}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <section className="relative overflow-hidden py-14 md:py-20">
          <GradientMesh />
          <div className="container relative max-w-2xl px-4">
            <SR>
              <Card className="overflow-hidden rounded-2xl border-border/50 shadow-lg">
                <div className="relative bg-gradient-to-br from-primary/15 via-accent/10 to-background p-10 text-center">
                  <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-2xl bg-primary/20 shadow-xl">
                    {formData.avatar_url ? (
                      <img
                        src={formData.avatar_url}
                        alt={formData.full_name}
                        className="h-28 w-28 rounded-2xl object-cover"
                      />
                    ) : (
                      <User className="h-14 w-14 text-primary" />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -left-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg transition-transform hover:scale-110"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        void handleAvatarSelected(event);
                      }}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{formData.full_name}</h2>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1 text-sm">
                      <Shield className="ml-1 h-3.5 w-3.5" />
                      {getRoleLabel(user.role, appLanguage)}
                    </Badge>
                    <Badge
                      variant={user.status === 'active' ? 'default' : 'destructive'}
                      className="px-3 py-1 text-sm"
                    >
                      {getStatusLabel(user.status, appLanguage)}
                    </Badge>
                  </div>
                </div>

                <CardContent className="space-y-5 p-7">
                  {editing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'الاسم الكامل',
                            en: 'Full name',
                          })}
                        </Label>
                        <Input
                          id="name"
                          className="h-12 rounded-xl"
                          value={formData.full_name}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              full_name: event.target.value,
                            }))
                          }
                        />
                        {errors.full_name && (
                          <p className="text-sm text-destructive">{errors.full_name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'البريد الإلكتروني',
                            en: 'Email',
                          })}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          className="h-12 rounded-xl"
                          value={formData.email}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              email: event.target.value,
                            }))
                          }
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'رقم الهاتف',
                            en: 'Phone number',
                          })}
                        </Label>
                        <Input
                          id="phone"
                          className="h-12 rounded-xl"
                          value={formData.phone}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              phone: event.target.value,
                            }))
                          }
                        />
                        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'اللغة',
                            en: 'Language',
                          })}
                        </Label>
                        <Select
                          value={formData.language}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              language: value === 'en' ? 'en' : 'ar',
                            }))
                          }
                        >
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ar">
                              {pickLocalizedCopy(appLanguage, {
                                ar: 'العربية',
                                en: 'Arabic',
                              })}
                            </SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => void handleSave()}
                          disabled={saving}
                          className="transition-transform hover:scale-[1.02]"
                        >
                          {saving
                            ? pickLocalizedCopy(appLanguage, {
                                ar: 'جارٍ الحفظ...',
                                en: 'Saving...',
                              })
                            : pickLocalizedCopy(appLanguage, {
                                ar: 'حفظ التغييرات',
                                en: 'Save changes',
                              })}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditing(false);
                            setFormData(buildFormState(user));
                            setErrors({});
                          }}
                          disabled={saving}
                        >
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'إلغاء',
                            en: 'Cancel',
                          })}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        {
                          icon: Mail,
                          label: pickLocalizedCopy(appLanguage, {
                            ar: 'البريد الإلكتروني',
                            en: 'Email',
                          }),
                          value: user.email,
                          ltr: true,
                        },
                        {
                          icon: Phone,
                          label: pickLocalizedCopy(appLanguage, {
                            ar: 'رقم الهاتف',
                            en: 'Phone number',
                          }),
                          value:
                            user.phone ||
                            pickLocalizedCopy(appLanguage, {
                              ar: 'غير مضاف',
                              en: 'Not provided',
                            }),
                          ltr: !!user.phone,
                        },
                        {
                          icon: Globe,
                          label: pickLocalizedCopy(appLanguage, {
                            ar: 'اللغة',
                            en: 'Language',
                          }),
                          value: getInterfaceLanguageLabel(
                            user.language === 'en' ? 'en' : 'ar',
                            appLanguage,
                          ),
                          ltr: false,
                        },
                      ].map(({ icon: Icon, label, value, ltr }) => (
                        <div
                          key={label}
                          className="flex items-center gap-4 rounded-xl bg-muted/30 p-4 transition-colors duration-200 hover:bg-muted/50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{label}</p>
                            {ltr ? (
                              <LtrText as="p" className="font-semibold">
                                {value}
                              </LtrText>
                            ) : (
                              <p className="font-semibold">{value}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        onClick={() => setEditing(true)}
                        className="mt-4 h-12 w-full transition-transform hover:scale-[1.01]"
                        variant="outline"
                      >
                        <Edit2 className="ml-2 h-4 w-4" />
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'تعديل الملف الشخصي',
                          en: 'Edit profile',
                        })}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </SR>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default ProfilePage;
