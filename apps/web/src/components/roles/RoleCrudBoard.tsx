import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type MockEntity = {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'archived';
  notes?: string;
};

type RoleCrudBoardProps = {
  title: string;
  description: string;
  entityLabel: string;
  initialItems: MockEntity[];
};

const emptyForm = { name: '', notes: '' };

export function RoleCrudBoard({
  title,
  description,
  entityLabel,
  initialItems,
}: RoleCrudBoardProps) {
  const { t } = useTranslation('common');
  const [items, setItems] = useState<MockEntity[]>(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === 'active').length;
    const pending = items.filter((i) => i.status === 'pending').length;
    return { total: items.length, active, pending };
  }, [items]);

  const upsertItem = () => {
    if (!form.name.trim()) return;

    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: form.name.trim(),
                notes: form.notes.trim(),
              }
            : item,
        ),
      );
      setEditingId(null);
    } else {
      setItems((prev) => [
        {
          id: `mock-${Date.now()}`,
          name: form.name.trim(),
          notes: form.notes.trim(),
          status: 'pending',
        },
        ...prev,
      ]);
    }

    setForm(emptyForm);
  };

  const editItem = (item: MockEntity) => {
    setEditingId(item.id);
    setForm({ name: item.name, notes: item.notes || '' });
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
  };

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === 'pending'
                  ? 'active'
                  : item.status === 'active'
                    ? 'archived'
                    : 'pending',
            }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('roleCrud.statsTotal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('roleCrud.statsActive')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('roleCrud.statsPending')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{entityLabel}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('roleCrud.inputPlaceholder', { entity: entityLabel })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('roleCrud.notesLabel')}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={t('roleCrud.notesPlaceholder')}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={upsertItem} className="gap-2">
              <Plus className="h-4 w-4" />
              {editingId ? t('roleCrud.updateBtn') : t('roleCrud.addBtn')}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                {t('roleCrud.cancelBtn')}
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{entityLabel}</TableHead>
                <TableHead>{t('roleCrud.statusHeader')}</TableHead>
                <TableHead>{t('roleCrud.notesHeader')}</TableHead>
                <TableHead>{t('roleCrud.actionsHeader')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'active'
                          ? 'default'
                          : item.status === 'pending'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {item.status === 'active'
                        ? t('roleCrud.statusActive')
                        : item.status === 'pending'
                          ? t('roleCrud.statusPending')
                          : t('roleCrud.statusArchived')}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.notes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editItem(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id)}>
                        {t('roleCrud.toggleStatus')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>
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
    </div>
  );
}
