import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, MessageSquare, Calendar, TrendingUp, Plus, Trash2 } from 'lucide-react';

type CoordinationTask = {
  id: string;
  title: string;
  role: string;
  owner: string;
  status: 'pending' | 'in_progress' | 'done';
};

type UserProfile = { id: string; user_id: string; full_name: string; status: string };

// Hardcoded stub data — will be replaced by real API calls in F10
const STUB_ROLE_STATS: Record<string, number> = {
  admin: 1,
  merchant: 3,
  tourist: 8,
  investor: 2,
  driver: 4,
  student: 5,
  resident: 6,
};

const STUB_PROFILES = [
  { id: 'u-001', user_id: 'u-001', full_name: 'أحمد محمد', status: 'active' },
  { id: 'u-002', user_id: 'u-002', full_name: 'فاطمة علي', status: 'active' },
  { id: 'u-003', user_id: 'u-003', full_name: 'محمود حسن', status: 'pending_verification' },
  { id: 'u-004', user_id: 'u-004', full_name: 'نورا سعيد', status: 'suspended' },
  { id: 'u-005', user_id: 'u-005', full_name: 'خالد إبراهيم', status: 'active' },
];

export default function ModeratorDashboard() {
  const [roleStats] = useState<Record<string, number>>(STUB_ROLE_STATS);
  const [profiles] = useState<UserProfile[]>(STUB_PROFILES);
  const [tasks, setTasks] = useState<CoordinationTask[]>([
    {
      id: 'task-1',
      title: 'تنسيق رحلة سياحية جماعية',
      role: 'tourist',
      owner: 'منسق السياحة',
      status: 'pending',
    },
    {
      id: 'task-2',
      title: 'متابعة احتياج تجار السوق',
      role: 'merchant',
      owner: 'منسق السوق',
      status: 'in_progress',
    },
  ]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskRole, setTaskRole] = useState('tourist');
  const [taskOwner, setTaskOwner] = useState('');

  const roleGroups = useMemo(() => {
    const groups: Record<string, UserProfile[]> = {};
    profiles.forEach((profile) => {
      const fallbackRole = 'unassigned';
      const role = Object.keys(roleStats).find((r) => r && r !== 'admin') || fallbackRole;
      if (!groups[role]) groups[role] = [];
      groups[role].push(profile);
    });
    return groups;
  }, [profiles, roleStats]);

  const addTask = () => {
    if (!taskTitle.trim()) return;
    const newTask: CoordinationTask = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      role: taskRole,
      owner: taskOwner.trim() || 'منسق عام',
      status: 'pending',
    };
    setTasks((prev) => [newTask, ...prev]);
    setTaskTitle('');
    setTaskOwner('');
  };

  const cycleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status:
                task.status === 'pending'
                  ? 'in_progress'
                  : task.status === 'in_progress'
                    ? 'done'
                    : 'pending',
            }
          : task,
      ),
    );
  };

  const deleteTask = (id: string) => setTasks((prev) => prev.filter((task) => task.id !== id));

  return (
    <Layout>
      <div className="container py-8 px-4 space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة تحكم المنسق</h1>
            <p className="text-muted-foreground">تنظيم الأدوار + CRUD تجريبي لمهام التنسيق</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(roleStats).map(([role, count]) => (
            <Card key={role}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{role}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="coordination" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="coordination">المهام</TabsTrigger>
            <TabsTrigger value="roles">تجميع الأدوار</TabsTrigger>
            <TabsTrigger value="channels">قنوات العمل</TabsTrigger>
          </TabsList>

          <TabsContent value="coordination">
            <Card>
              <CardHeader>
                <CardTitle>إدارة مهام التنسيق</CardTitle>
                <CardDescription>CRUD تجريبي لتوزيع المهام بين الأدوار</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    placeholder="عنوان المهمة"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                  <Input
                    placeholder="الدور المستهدف"
                    value={taskRole}
                    onChange={(e) => setTaskRole(e.target.value)}
                  />
                  <Input
                    placeholder="المسؤول"
                    value={taskOwner}
                    onChange={(e) => setTaskOwner(e.target.value)}
                  />
                  <Button onClick={addTask} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة مهمة
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المهمة</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>المسؤول</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{task.role}</Badge>
                        </TableCell>
                        <TableCell>{task.owner}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === 'done'
                                ? 'default'
                                : task.status === 'in_progress'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => cycleTask(task.id)}>
                              تبديل
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                <CardTitle>تجميع المستخدمين حسب الدور</CardTitle>
                <CardDescription>متابعة توزيع المستخدمين للتنسيق بين الفرق</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(roleGroups).map(([role, users]) => (
                    <Card key={role}>
                      <CardHeader>
                        <CardTitle className="text-lg">{role}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {users.slice(0, 5).map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between rounded-md border border-border p-3"
                          >
                            <span>{u.full_name}</span>
                            <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                              {u.status}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels">
            <Card>
              <CardHeader>
                <CardTitle>قنوات التواصل التنظيمي</CardTitle>
                <CardDescription>نقاط متابعة بين الفرق</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">تقويم تشغيلي موحد</h3>
                    <p className="text-sm text-muted-foreground">
                      تنسيق الجداول بين السياحة والنقل والسوق
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
                  <MessageSquare className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">قناة البلاغات</h3>
                    <p className="text-sm text-muted-foreground">
                      تجميع ملاحظات الفرق وحل التعارضات
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
