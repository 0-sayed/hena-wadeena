import { UserRole } from '@hena-wadeena/types';
import { AlertCircle, Eye, MoreHorizontal, Search, UserX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

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
import { LtrText } from '@/components/ui/ltr-text';
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
import { useAuth } from '@/hooks/use-auth';
import { useChangeUserRole, useChangeUserStatus, useAdminUsers } from '@/hooks/use-admin';
import { useDebounce } from '@/hooks/use-debounce';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';

type LocalizedLabel = {
  ar: string;
  en: string;
};

const roleLabels: Record<string, LocalizedLabel> = {
  admin: { ar: 'مدير', en: 'Admin' },
  moderator: { ar: 'مشرف', en: 'Moderator' },
  reviewer: { ar: 'مراجع', en: 'Reviewer' },
  tourist: { ar: 'سائح', en: 'Tourist' },
  resident: { ar: 'مقيم', en: 'Resident' },
  student: { ar: 'طالب', en: 'Student' },
  merchant: { ar: 'تاجر', en: 'Merchant' },
  driver: { ar: 'سائق', en: 'Driver' },
  guide: { ar: 'مرشد', en: 'Guide' },
  investor: { ar: 'مستثمر', en: 'Investor' },
};

const statusLabels: Record<string, LocalizedLabel> = {
  active: { ar: 'نشط', en: 'Active' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
  banned: { ar: 'محظور', en: 'Banned' },
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  suspended: 'secondary',
  banned: 'destructive',
};

function localizedRole(role: string, language: AppLanguage) {
  return pickLocalizedCopy(language, roleLabels[role] ?? { ar: role, en: role });
}

function localizedStatus(status: string, language: AppLanguage) {
  return pickLocalizedCopy(language, statusLabels[status] ?? { ar: status, en: status });
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';

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
        <p className="text-lg text-muted-foreground">
          {pickLocalizedCopy(appLanguage, {
            ar: 'فشل تحميل المستخدمين',
            en: 'Failed to load users',
          })}
        </p>
      </div>
    );
  }

  const usersDescription = !data
    ? pickLocalizedCopy(appLanguage, { ar: 'جارٍ التحميل...', en: 'Loading...' })
    : pickLocalizedCopy(appLanguage, {
        ar: `${data.total} مستخدم`,
        en: `${data.total} ${data.total === 1 ? 'user' : 'users'}`,
      });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {pickLocalizedCopy(appLanguage, {
            ar: 'إدارة المستخدمين',
            en: 'User management',
          })}
        </h1>
        <p className="text-muted-foreground">
          {pickLocalizedCopy(appLanguage, {
            ar: 'عرض الحسابات، فتح الملف الإداري، وإدارة الدور والحالة.',
            en: 'Browse accounts, open the admin profile, and manage roles and status.',
          })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{pickLocalizedCopy(appLanguage, { ar: 'المستخدمون', en: 'Users' })}</CardTitle>
          <CardDescription>{usersDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="search-inline-icon-md absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={pickLocalizedCopy(appLanguage, {
                  ar: 'بحث بالاسم أو البريد...',
                  en: 'Search by name or email...',
                })}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="search-input-with-icon-md"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue
                  placeholder={pickLocalizedCopy(appLanguage, { ar: 'الدور', en: 'Role' })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {pickLocalizedCopy(appLanguage, { ar: 'جميع الأدوار', en: 'All roles' })}
                </SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {pickLocalizedCopy(appLanguage, label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue
                  placeholder={pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {pickLocalizedCopy(appLanguage, { ar: 'جميع الحالات', en: 'All statuses' })}
                </SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {pickLocalizedCopy(appLanguage, label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الاسم', en: 'Name' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'البريد', en: 'Email' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الدور', en: 'Role' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}</TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'تاريخ التسجيل',
                      en: 'Joined on',
                    })}
                  </TableHead>
                  <TableHead className="w-24">
                    {pickLocalizedCopy(appLanguage, { ar: 'الملف', en: 'Profile' })}
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
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
                        <Skeleton className="h-8 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <UserX className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'لا يوجد مستخدمون',
                            en: 'No users found',
                          })}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-end text-primary transition-colors hover:text-primary/80 hover:underline"
                          onClick={() => {
                            void navigate(`/admin/users/${user.id}`);
                          }}
                        >
                          {user.fullName}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <LtrText>{user.email}</LtrText>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{localizedRole(user.role, appLanguage)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[user.status] || 'secondary'}>
                          {localizedStatus(user.status, appLanguage)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigate(`/admin/users/${user.id}`);
                          }}
                        >
                          <Eye className="ms-2 h-4 w-4" />
                          {pickLocalizedCopy(appLanguage, { ar: 'عرض', en: 'View' })}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                void navigate(`/admin/users/${user.id}`);
                              }}
                            >
                              <Eye className="ms-2 h-4 w-4" />
                              {pickLocalizedCopy(appLanguage, {
                                ar: 'عرض الملف',
                                en: 'View profile',
                              })}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>
                              {pickLocalizedCopy(appLanguage, {
                                ar: 'تغيير الدور',
                                en: 'Change role',
                              })}
                            </DropdownMenuLabel>
                            {Object.entries(roleLabels).map(([role, label]) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={(role as UserRole) === user.role || changeRole.isPending}
                                onClick={() =>
                                  changeRole.mutate({ id: user.id, role: role as UserRole })
                                }
                              >
                                {pickLocalizedCopy(appLanguage, label)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>
                              {pickLocalizedCopy(appLanguage, {
                                ar: 'تغيير الحالة',
                                en: 'Change status',
                              })}
                            </DropdownMenuLabel>
                            {user.status !== 'active' && (
                              <DropdownMenuItem
                                disabled={changeStatus.isPending}
                                onClick={() =>
                                  changeStatus.mutate({ id: user.id, status: 'active' })
                                }
                              >
                                {pickLocalizedCopy(appLanguage, {
                                  ar: 'تفعيل',
                                  en: 'Activate',
                                })}
                              </DropdownMenuItem>
                            )}
                            {user.status !== 'suspended' && (
                              <DropdownMenuItem
                                disabled={changeStatus.isPending}
                                onClick={() =>
                                  changeStatus.mutate({ id: user.id, status: 'suspended' })
                                }
                              >
                                {pickLocalizedCopy(appLanguage, {
                                  ar: 'إيقاف مؤقت',
                                  en: 'Suspend',
                                })}
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
                                {pickLocalizedCopy(appLanguage, { ar: 'حظر', en: 'Ban' })}
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

          {data && data.total > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: `صفحة ${page} من ${Math.ceil(data.total / limit)}`,
                  en: `Page ${page} of ${Math.ceil(data.total / limit)}`,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  {pickLocalizedCopy(appLanguage, { ar: 'السابق', en: 'Previous' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {pickLocalizedCopy(appLanguage, { ar: 'التالي', en: 'Next' })}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
