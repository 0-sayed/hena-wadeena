import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Users, FileCheck, Activity, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const roleOptions = [
  'admin',
  'moderator',
  'reviewer',
  'investor',
  'merchant',
  'tourist',
  'student',
  'resident',
  'driver',
];

type UserProfile = {
  id: string;
  user_id: string;
  full_name: string;
  city: string;
  status: string;
  created_at: string;
};
type UserDocument = {
  id: string;
  file_name: string;
  document_type: string;
  verified: boolean;
  created_at: string;
};
type UserRole = { id: string; user_id: string; role: string; created_at: string };

// Hardcoded stub data — will be replaced by real API calls in F10
const STUB_USERS: UserProfile[] = [
  {
    id: 'u-001',
    user_id: 'u-001',
    full_name: 'أحمد محمد',
    city: 'الخارجة',
    status: 'active',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'u-002',
    user_id: 'u-002',
    full_name: 'فاطمة علي',
    city: 'الداخلة',
    status: 'active',
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'u-003',
    user_id: 'u-003',
    full_name: 'محمود حسن',
    city: 'الفرافرة',
    status: 'pending_verification',
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'u-004',
    user_id: 'u-004',
    full_name: 'نورا سعيد',
    city: 'باريس',
    status: 'suspended',
    created_at: '2026-02-10T10:00:00Z',
  },
];

const STUB_DOCUMENTS = [
  {
    id: 'd-001',
    file_name: 'هوية_أحمد.pdf',
    document_type: 'national_id',
    verified: true,
    created_at: '2026-01-16T10:00:00Z',
  },
  {
    id: 'd-002',
    file_name: 'رخصة_تجارية.pdf',
    document_type: 'business_license',
    verified: false,
    created_at: '2026-01-21T10:00:00Z',
  },
  {
    id: 'd-003',
    file_name: 'شهادة_محمود.pdf',
    document_type: 'certificate',
    verified: false,
    created_at: '2026-02-02T10:00:00Z',
  },
];

const STUB_ROLES = [
  { id: 'r-001', user_id: 'u-001', role: 'admin', created_at: '2026-01-15T10:00:00Z' },
  { id: 'r-002', user_id: 'u-002', role: 'merchant', created_at: '2026-01-20T10:00:00Z' },
  { id: 'r-003', user_id: 'u-003', role: 'tourist', created_at: '2026-02-01T10:00:00Z' },
  { id: 'r-004', user_id: 'u-004', role: 'investor', created_at: '2026-02-10T10:00:00Z' },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>(STUB_USERS);
  const [documents] = useState<UserDocument[]>(STUB_DOCUMENTS);
  const [roles, setRoles] = useState<UserRole[]>(STUB_ROLES);

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === 'active').length,
      pendingDocs: documents.filter((d) => !d.verified).length,
      totalRoles: roles.length,
    }),
    [users, documents, roles],
  );

  const [newUserName, setNewUserName] = useState('');
  const [newUserCity, setNewUserCity] = useState('');
  const [roleUserId, setRoleUserId] = useState('');
  const [roleValue, setRoleValue] = useState('tourist');

  const updateUserStatus = (
    userId: string,
    status: 'active' | 'inactive' | 'suspended' | 'pending_verification',
  ) => {
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, status } : u)));
    toast.success('تم تحديث حالة المستخدم');
  };

  const addMockUser = () => {
    if (!newUserName.trim()) return;
    const id = `mock-${Date.now()}`;
    const mockUser = {
      id,
      user_id: id,
      full_name: newUserName.trim(),
      city: newUserCity.trim() || '-',
      status: 'pending_verification',
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [mockUser, ...prev]);
    setNewUserName('');
    setNewUserCity('');
    toast.success('تمت إضافة مستخدم تجريبي');
  };

  const deleteMockUser = (userId: string) => {
    if (!userId.startsWith('mock-')) return;
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const addMockRole = () => {
    if (!roleUserId) return;
    const roleEntry = {
      id: `mock-role-${Date.now()}`,
      user_id: roleUserId,
      role: roleValue,
      created_at: new Date().toISOString(),
    };
    setRoles((prev) => [roleEntry, ...prev]);
    toast.success('تمت إضافة دور تجريبي');
  };

  const removeMockRole = (id: string) => {
    if (!id.startsWith('mock-role-')) return;
    setRoles((prev) => prev.filter((r) => r.id !== id));
  };

  const groupedRoles = useMemo(() => {
    return roles.reduce((acc: Record<string, string[]>, entry) => {
      if (!acc[entry.user_id]) acc[entry.user_id] = [];
      acc[entry.user_id].push(entry.role);
      return acc;
    }, {});
  }, [roles]);

  return (
    <Layout>
      <div className="container py-8 px-4 space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة تحكم الإدارة</h1>
            <p className="text-muted-foreground">صلاحيات شاملة + CRUD تجريبي للأدوار والمستخدمين</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">إجمالي المستخدمين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">المستخدمون النشطون</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">مستندات معلقة</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDocs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">إجمالي الأدوار</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRoles}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">المستخدمون</TabsTrigger>
            <TabsTrigger value="roles">الأدوار</TabsTrigger>
            <TabsTrigger value="docs">المستندات</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المستخدمين</CardTitle>
                <CardDescription>تحديث الحالة + إضافة/حذف عناصر تجريبية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    placeholder="اسم المستخدم التجريبي"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                  <Input
                    placeholder="المدينة"
                    value={newUserCity}
                    onChange={(e) => setNewUserCity(e.target.value)}
                  />
                  <Button onClick={addMockUser} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة مستخدم تجريبي
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>المدينة</TableHead>
                      <TableHead>الأدوار</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.city || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(groupedRoles[user.user_id] || ['-']).map((role, idx) => (
                              <Badge key={`${user.user_id}-${role}-${idx}`} variant="secondary">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === 'active'
                                ? 'default'
                                : user.status === 'pending_verification'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.status !== 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserStatus(user.user_id, 'active')}
                              >
                                تفعيل
                              </Button>
                            )}
                            {user.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserStatus(user.user_id, 'suspended')}
                              >
                                إيقاف
                              </Button>
                            )}
                            {user.user_id.startsWith('mock-') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMockUser(user.user_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>إدارة الأدوار</CardTitle>
                <CardDescription>واجهة CRUD تجريبية لتوزيع الأدوار</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>المستخدم</Label>
                    <Select value={roleUserId} onValueChange={setRoleUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مستخدم" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الدور</Label>
                    <Select value={roleValue} onValueChange={setRoleValue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addMockRole} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      إسناد دور تجريبي
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          {users.find((u) => u.user_id === role.user_id)?.full_name || role.user_id}
                        </TableCell>
                        <TableCell>
                          <Badge>{role.role}</Badge>
                        </TableCell>
                        <TableCell>{new Date(role.created_at).toLocaleDateString('ar')}</TableCell>
                        <TableCell>
                          {role.id.startsWith('mock-role-') && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeMockRole(role.id)}
                            >
                              حذف
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle>المستندات</CardTitle>
                <CardDescription>متابعة حالة توثيق مستندات التسجيل</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الملف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.file_name}</TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>
                          <Badge variant={doc.verified ? 'default' : 'secondary'}>
                            {doc.verified ? 'موثق' : 'قيد المراجعة'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString('ar')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
