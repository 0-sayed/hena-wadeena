import { UserRole } from '@hena-wadeena/types';
import { AlertCircle, MoreHorizontal, Search, UserX } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminUsers, useChangeUserRole, useChangeUserStatus } from '@/hooks/use-admin';
import { useDebounce } from '@/hooks/use-debounce';

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  tourist: 'سائح',
  resident: 'مقيم',
  student: 'طالب',
  merchant: 'تاجر',
  driver: 'سائق',
  guide: 'مرشد',
  investor: 'مستثمر',
};

const statusLabels: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  banned: 'محظور',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  suspended: 'secondary',
  banned: 'destructive',
};

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, error } = useAdminUsers({
    search: debouncedSearch || undefined,
    role: roleFilter !== 'all' ? (roleFilter as UserRole) : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  });

  const changeRole = useChangeUserRole();
  const changeStatus = useChangeUserStatus();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">فشل تحميل المستخدمين</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <p className="text-muted-foreground">عرض وتعديل بيانات المستخدمين</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المستخدمون</CardTitle>
          <CardDescription>{data ? `${data.total} مستخدم` : 'جاري التحميل...'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pr-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأدوار</SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <UserX className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">لا يوجد مستخدمون</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleLabels[user.role] || user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[user.status] || 'secondary'}>
                          {statusLabels[user.status] || user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>تغيير الدور</DropdownMenuLabel>
                            {Object.entries(roleLabels).map(([role, label]) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={(role as UserRole) === user.role || changeRole.isPending}
                                onClick={() =>
                                  changeRole.mutate({ id: user.id, role: role as UserRole })
                                }
                              >
                                {label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                            {user.status !== 'active' && (
                              <DropdownMenuItem
                                disabled={changeStatus.isPending}
                                onClick={() =>
                                  changeStatus.mutate({ id: user.id, status: 'active' })
                                }
                              >
                                تفعيل
                              </DropdownMenuItem>
                            )}
                            {user.status !== 'suspended' && (
                              <DropdownMenuItem
                                disabled={changeStatus.isPending}
                                onClick={() =>
                                  changeStatus.mutate({ id: user.id, status: 'suspended' })
                                }
                              >
                                إيقاف مؤقت
                              </DropdownMenuItem>
                            )}
                            {user.status !== 'banned' && (
                              <DropdownMenuItem
                                disabled={changeStatus.isPending}
                                className="text-destructive"
                                onClick={() =>
                                  changeStatus.mutate({ id: user.id, status: 'banned' })
                                }
                              >
                                حظر
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.total > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                صفحة {page} من {Math.ceil(data.total / limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
