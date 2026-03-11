import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { User, Mail, Phone, MapPin, Edit2, Camera, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authAPI, type AuthUser } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '' });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored) as AuthUser;
      setUser(u);
      setFormData({ full_name: u.full_name, phone: u.phone, email: u.email });
    } else {
      authAPI
        .getMe()
        .then((u) => {
          setUser(u);
          setFormData({ full_name: u.full_name, phone: u.phone, email: u.email });
        })
        .catch(() => navigate('/login'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleLabels: Record<string, string> = {
    admin: 'مدير',
    tourist: 'سائح',
    investor: 'مستثمر',
    farmer: 'مزارع',
    guide: 'مرشد سياحي',
    student: 'طالب',
    driver: 'سائق',
    citizen: 'مواطن',
  };

  const handleSave = () => {
    if (user) {
      const updated = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditing(false);
      toast.success('تم تحديث الملف الشخصي بنجاح');
    }
  };

  if (!user)
    return (
      <Layout>
        <div className="container py-20 max-w-2xl space-y-6">
          <Skeleton h="h-64" className="rounded-2xl" />
          <Skeleton h="h-48" className="rounded-2xl" />
        </div>
      </Layout>
    );

  return (
    <Layout>
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-2xl">
            <SR>
              <Card className="border-border/50 overflow-hidden rounded-2xl shadow-lg">
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-background p-10 text-center relative">
                  <div className="mx-auto h-28 w-28 rounded-2xl bg-primary/20 flex items-center justify-center mb-5 relative shadow-xl group">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-28 w-28 rounded-2xl object-cover"
                      />
                    ) : (
                      <User className="h-14 w-14 text-primary" />
                    )}
                    <button className="absolute -bottom-2 -left-2 h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform">
                      <Camera className="h-5 w-5" />
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{user.full_name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Shield className="h-3.5 w-3.5 ml-1" />
                      {roleLabels[user.role] || user.role}
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
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input
                          id="email"
                          type="email"
                          className="h-12 rounded-xl"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">رقم الهاتف</Label>
                        <Input
                          id="phone"
                          className="h-12 rounded-xl"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleSave}
                          className="hover:scale-[1.02] transition-transform"
                        >
                          حفظ التغييرات
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(false)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { icon: Mail, label: 'البريد الإلكتروني', value: user.email },
                        { icon: Phone, label: 'رقم الهاتف', value: user.phone },
                        {
                          icon: MapPin,
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
