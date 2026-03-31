import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { User, Mail, Phone, Globe, Edit2, Camera, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authAPI } from '@/services/api';
import type { AuthUser } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';

type ProfileFormState = {
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string;
};

type ProfileErrors = Partial<Record<keyof ProfileFormState, string>>;

const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  tourist: 'سائح',
  investor: 'مستثمر',
  merchant: 'تاجر',
  guide: 'مرشد سياحي',
  student: 'طالب',
  driver: 'سائق',
  resident: 'مقيم',
  moderator: 'منسق',
  reviewer: 'مراجع',
};

function buildFormState(user: AuthUser): ProfileFormState {
  return {
    full_name: user.full_name,
    phone: user.phone ?? '',
    email: user.email,
    avatar_url: user.avatar_url ?? '',
  };
}

function validateProfileForm(formData: ProfileFormState): ProfileErrors {
  const errors: ProfileErrors = {};

  if (!formData.full_name.trim()) {
    errors.full_name = 'الاسم الكامل مطلوب';
  } else if (formData.full_name.trim().length < 3) {
    errors.full_name = 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل';
  }

  if (!formData.email.trim()) {
    errors.email = 'البريد الإلكتروني مطلوب';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(formData.email.trim())) {
    errors.email = 'أدخل بريداً إلكترونياً صحيحاً';
  }

  if (formData.phone.trim() && !PHONE_REGEX.test(formData.phone.trim())) {
    errors.phone = 'أدخل رقم هاتف صحيحاً';
  }

  return errors;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('تعذر قراءة الصورة'));
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}

const ProfilePage = () => {
  const { user, isLoading, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormState>({
    full_name: '',
    phone: '',
    email: '',
    avatar_url: '',
  });
  const [errors, setErrors] = useState<ProfileErrors>({});

  useEffect(() => {
    if (!user) return;
    setFormData(buildFormState(user));
    setErrors({});
  }, [user]);

  const handleSave = async () => {
    const validationErrors = validateProfileForm(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const updatedUser = await authAPI.updateMe({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        avatar_url: formData.avatar_url || undefined,
      });
      updateUser(updatedUser);
      setEditing(false);
      toast.success('تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث الملف الشخصي';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('اختر صورة بصيغة JPG أو PNG أو WebP');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('حجم الصورة يجب ألا يتجاوز 2 ميجابايت');
      event.target.value = '';
      return;
    }

    try {
      const avatarUrl = await readFileAsDataUrl(file);
      setFormData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      setEditing(true);
      setErrors((prev) => ({ ...prev, avatar_url: undefined }));
      toast.success('تم تجهيز الصورة. احفظ التغييرات لتحديث الملف الشخصي');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر قراءة الصورة';
      toast.error(message);
    } finally {
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 max-w-2xl space-y-6">
          <Skeleton h="h-64" className="rounded-2xl" />
          <Skeleton h="h-48" className="rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container py-20 max-w-2xl text-center text-muted-foreground">
          لا يمكن تحميل الملف الشخصي حالياً.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-2xl">
            <SR>
              <Card className="border-border/50 overflow-hidden rounded-2xl shadow-lg">
                <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-background p-10 text-center relative">
                  <div className="mx-auto h-28 w-28 rounded-2xl bg-primary/20 flex items-center justify-center mb-5 relative shadow-xl">
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
                      className="absolute -bottom-2 -left-2 h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarSelected}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{formData.full_name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Shield className="h-3.5 w-3.5 ml-1" />
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                    <Badge
                      variant={user.status === 'active' ? 'default' : 'destructive'}
                      className="text-sm px-3 py-1"
                    >
                      {user.status === 'active' ? 'نشط' : 'معلّق'}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-7 space-y-5">
                  {editing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">الاسم الكامل</Label>
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
                        <Label htmlFor="email">البريد الإلكتروني</Label>
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
                        <Label htmlFor="phone">رقم الهاتف</Label>
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
                      <div className="flex gap-3">
                        <Button
                          onClick={() => void handleSave()}
                          disabled={saving}
                          className="hover:scale-[1.02] transition-transform"
                        >
                          {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
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
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { icon: Mail, label: 'البريد الإلكتروني', value: user.email },
                        { icon: Phone, label: 'رقم الهاتف', value: user.phone || 'غير مضاف' },
                        {
                          icon: Globe,
                          label: 'اللغة',
                          value: user.language === 'ar' ? 'العربية' : 'English',
                        },
                      ].map(({ icon: Icon, label, value }) => (
                        <div
                          key={label}
                          className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{label}</p>
                            <p className="font-semibold">{value}</p>
                          </div>
                        </div>
                      ))}
                      <Button
                        onClick={() => setEditing(true)}
                        className="w-full mt-4 h-12 hover:scale-[1.01] transition-transform"
                        variant="outline"
                      >
                        <Edit2 className="h-4 w-4 ml-2" />
                        تعديل الملف الشخصي
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
