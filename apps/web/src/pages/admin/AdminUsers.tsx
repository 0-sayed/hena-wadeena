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
import { useTranslation } from 'react-i18next';

const roleKeys = [
  'admin',
  'moderator',
  'reviewer',
  'tourist',
  'resident',
  'student',
  'merchant',
  'driver',
  'guide',
  'investor',
];

const statusKeys = ['active', 'suspended', 'banned'];

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  suspended: 'secondary',
  banned: 'destructive',
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { language } = useAuth();
  const { t } = useTranslation('admin');
  const locale = language === 'en' ? 'en-US' : 'ar-EG';

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
          {t('users.loadError')}
        </p>
      </div>
    );
  }

  const usersDescription = !data
    ? t('users.loading')
    : t('users.count', { count: data.total });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t('users.pageTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('users.pageSubtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('users.cardTitle')}</CardTitle>
          <CardDescription>{usersDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="search-inline-icon-md absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('users.searchPlaceholder')}
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
                <SelectValue placeholder={t('users.roleFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.allRoles')}</SelectItem>
                {roleKeys.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`users.roles.${role}`)}
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
                <SelectValue placeholder={t('users.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.allStatuses')}</SelectItem>
                {statusKeys.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`users.statuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.table.name')}</TableHead>
                  <TableHead>{t('users.table.email')}</TableHead>
                  <TableHead>{t('users.table.role')}</TableHead>
                  <TableHead>{t('users.table.status')}</TableHead>
                  <TableHead>{t('users.table.joined')}</TableHead>
                  <TableHead className="w-24">{t('users.table.profile')}</TableHead>
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
                        <p className="text-muted-foreground">{t('users.noUsers')}</p>
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
                        <Badge variant="secondary">{t(`users.roles.${user.role}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[user.status] || 'secondary'}>
                          {t(`users.statuses.${user.status}`)}
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
                          {t('users.actions.view')}
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
                              {t('users.actions.viewProfile')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('users.actions.changeRole')}</DropdownMenuLabel>
                            {roleKeys.map((role) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={(role as UserRole) === user.role || changeRole.isPending}
                                onClick={() =>
                                  changeRole.mutate({ id: user.id, role: role as UserRole })
                                }
                              >
                                {t(`users.roles.${role}`)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('users.actions.changeStatus')}</DropdownMenuLabel>
                            {user.status !== 'active' && (
                              <DropdownMenuItem
                                disabled={changeStatus.isPending}
                                onClick={() =>
                                  changeStatus.mutate({ id: user.id, status: 'active' })
                                }
                              >
                                {t('users.actions.activate')}
                              </DropdownMenuItem>
                            )}
                            {user.status !== 'suspended' && (
                              <DropdownMenuItem
                                disabled={changeStatus.isPending}
                                onClick={() =>
                                  changeStatus.mutate({ id: user.id, status: 'suspended' })
                                }
                              >
                                {t('users.actions.suspend')}
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
                                {t('users.actions.ban')}
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
                {t('users.pagination.page', { page, total: Math.ceil(data.total / limit) })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  {t('users.pagination.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t('users.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
