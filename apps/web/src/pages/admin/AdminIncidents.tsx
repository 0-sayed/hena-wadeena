import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useAdminIncidents, useUpdateIncident } from '@/hooks/use-incidents';
import {
  ALL_STATUSES,
  STATUS_VARIANT,
  getIncidentDescription,
  statusLabel,
  typeLabel,
} from '@/lib/incidents';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import type { EnvironmentalIncident, IncidentStatus } from '@/services/api';

export default function AdminIncidents() {
  const { language } = useAuth();
  const lang: AppLanguage = language === 'en' ? 'en' : 'ar';

  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [selected, setSelected] = useState<EnvironmentalIncident | null>(null);
  const [newStatus, setNewStatus] = useState<IncidentStatus | ''>('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useAdminIncidents({
    page,
    limit: 20,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const updateIncident = useUpdateIncident();

  const openDialog = (incident: EnvironmentalIncident) => {
    setSelected(incident);
    setNewStatus(incident.status);
    setAdminNotes(incident.adminNotes ?? '');
  };

  const closeDialog = () => {
    setSelected(null);
    setNewStatus('');
    setAdminNotes('');
  };

  const handleUpdate = () => {
    if (!selected || !newStatus) return;
    updateIncident.mutate(
      { id: selected.id, body: { status: newStatus, adminNotes: adminNotes.trim() } },
      {
        onSuccess: closeDialog,
        onError: () => {
          toast.error(
            pickLocalizedCopy(lang, {
              ar: 'تعذر تحديث البلاغ',
              en: 'Failed to update incident',
            }),
          );
        },
      },
    );
  };

  const incidents = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {pickLocalizedCopy(lang, { ar: 'البلاغات البيئية', en: 'Environmental Incidents' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Select
              value={filterStatus}
              onValueChange={(v) => {
                setFilterStatus(v as IncidentStatus | 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {pickLocalizedCopy(lang, { ar: 'جميع الحالات', en: 'All Statuses' })}
                </SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s, lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {pickLocalizedCopy(lang, { ar: `${total} بلاغ`, en: `${total} incidents` })}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-md" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pickLocalizedCopy(lang, { ar: 'النوع', en: 'Type' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(lang, { ar: 'الحالة', en: 'Status' })}</TableHead>
                  <TableHead>
                    {pickLocalizedCopy(lang, { ar: 'الوصف', en: 'Description' })}
                  </TableHead>
                  <TableHead>{pickLocalizedCopy(lang, { ar: 'التاريخ', en: 'Date' })}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => {
                  const description = getIncidentDescription(incident, lang);

                  return (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">
                        {typeLabel(incident.incidentType, lang)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[incident.status]}>
                          {statusLabel(incident.status, lang)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate text-muted-foreground"
                        dir={description?.dir}
                      >
                        {description?.text ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(incident.createdAt).toLocaleDateString(
                          lang === 'en' ? 'en-US' : 'ar-EG',
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openDialog(incident)}>
                          {pickLocalizedCopy(lang, { ar: 'مراجعة', en: 'Review' })}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {incidents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {pickLocalizedCopy(lang, { ar: 'لا توجد بلاغات', en: 'No incidents found' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {(page > 1 || hasMore) && (
            <div className="mt-4 flex justify-center gap-3">
              {page > 1 && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
                  {pickLocalizedCopy(lang, { ar: 'السابق', en: 'Previous' })}
                </Button>
              )}
              {hasMore && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                  {pickLocalizedCopy(lang, { ar: 'التالي', en: 'Next' })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pickLocalizedCopy(lang, { ar: 'مراجعة البلاغ', en: 'Review Incident' })}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {(() => {
                const description = getIncidentDescription(selected, lang);

                return (
                  <>
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <p className="font-medium">{typeLabel(selected.incidentType, lang)}</p>
                      <p className="mt-1 text-muted-foreground" dir={description?.dir}>
                        {description?.text ?? '—'}
                      </p>
                      {selected.eeaaReference && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          EEAA: {selected.eeaaReference}
                        </p>
                      )}
                    </div>
                    {selected.photos.length > 0 && (
                      <div className="flex justify-center gap-2 overflow-x-auto pb-1">
                        {selected.photos.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            loading="lazy"
                            className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>
                        {pickLocalizedCopy(lang, { ar: 'تغيير الحالة', en: 'Update Status' })}
                      </Label>
                      <Select
                        value={newStatus}
                        onValueChange={(v) => setNewStatus(v as IncidentStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabel(s, lang)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminNotes">
                        {pickLocalizedCopy(lang, { ar: 'ملاحظات الإدارة', en: 'Admin Notes' })}
                      </Label>
                      <Textarea
                        id="adminNotes"
                        rows={3}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder={pickLocalizedCopy(lang, {
                          ar: 'أضف ملاحظة...',
                          en: 'Add a note...',
                        })}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {pickLocalizedCopy(lang, { ar: 'إلغاء', en: 'Cancel' })}
            </Button>
            <Button onClick={handleUpdate} disabled={updateIncident.isPending}>
              {updateIncident.isPending
                ? pickLocalizedCopy(lang, { ar: 'جارٍ الحفظ...', en: 'Saving...' })
                : pickLocalizedCopy(lang, { ar: 'حفظ', en: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
