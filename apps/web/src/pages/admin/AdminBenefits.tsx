import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  useAdminCreateBenefit,
  useAdminDeleteBenefit,
  useAdminUpdateBenefit,
  useBenefits,
} from '@/hooks/use-benefits';
import type { BenefitInfo } from '@/services/api';

interface BenefitFormData {
  slug: string;
  nameAr: string;
  nameEn: string;
  ministryAr: string;
  documentsAr: string;
  officeNameAr: string;
  officePhone: string;
  officeAddressAr: string;
  enrollmentNotesAr: string;
}

const EMPTY_FORM: BenefitFormData = {
  slug: '',
  nameAr: '',
  nameEn: '',
  ministryAr: '',
  documentsAr: '',
  officeNameAr: '',
  officePhone: '',
  officeAddressAr: '',
  enrollmentNotesAr: '',
};

function benefitToForm(b: BenefitInfo): BenefitFormData {
  return {
    slug: b.slug,
    nameAr: b.nameAr,
    nameEn: b.nameEn,
    ministryAr: b.ministryAr,
    documentsAr: b.documentsAr.join('\n'),
    officeNameAr: b.officeNameAr,
    officePhone: b.officePhone,
    officeAddressAr: b.officeAddressAr,
    enrollmentNotesAr: b.enrollmentNotesAr,
  };
}

export default function AdminBenefits() {
  const { data: benefits, isLoading } = useBenefits();
  const createMutation = useAdminCreateBenefit();
  const updateMutation = useAdminUpdateBenefit();
  const deleteMutation = useAdminDeleteBenefit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BenefitInfo | null>(null);
  const [form, setForm] = useState<BenefitFormData>(EMPTY_FORM);

  function set<K extends keyof BenefitFormData>(field: K, value: BenefitFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(b: BenefitInfo) {
    setEditing(b);
    setForm(benefitToForm(b));
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const payload = {
      slug: form.slug.trim(),
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      ministryAr: form.ministryAr.trim(),
      documentsAr: form.documentsAr
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      officeNameAr: form.officeNameAr.trim(),
      officePhone: form.officePhone.trim(),
      officeAddressAr: form.officeAddressAr.trim(),
      enrollmentNotesAr: form.enrollmentNotesAr.trim(),
    };
    try {
      if (editing) {
        const { slug: _slug, ...body } = payload;
        await updateMutation.mutateAsync({ slug: editing.slug, body });
        toast.success('تم تحديث البرنامج');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('تم إنشاء البرنامج');
      }
      setDialogOpen(false);
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
  }

  async function handleDelete(b: BenefitInfo) {
    if (!window.confirm(`هل تريد حذف "${b.nameAr}"؟`)) return;
    try {
      await deleteMutation.mutateAsync(b.slug);
      toast.success('تم الحذف');
    } catch {
      toast.error('حدث خطأ');
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة برامج الدعم</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          برنامج جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الوزارة</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">المعرف (slug)</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {benefits?.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nameAr}</TableCell>
                <TableCell className="text-muted-foreground">{b.ministryAr}</TableCell>
                <TableCell className="text-muted-foreground">{b.officePhone}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{b.slug}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="حذف"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => void handleDelete(b)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!benefits || benefits.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  لا توجد برامج دعم
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل البرنامج' : 'إنشاء برنامج جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="slug">المعرف (slug) *</Label>
                <Input
                  id="slug"
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="takaful-wa-karama"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nameAr">الاسم بالعربية *</Label>
                <Input
                  id="nameAr"
                  value={form.nameAr}
                  onChange={(e) => set('nameAr', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nameEn">الاسم بالإنجليزية *</Label>
                <Input
                  id="nameEn"
                  dir="ltr"
                  value={form.nameEn}
                  onChange={(e) => set('nameEn', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ministryAr">الوزارة المسؤولة *</Label>
              <Input
                id="ministryAr"
                value={form.ministryAr}
                onChange={(e) => set('ministryAr', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="documentsAr">المستندات المطلوبة * (سطر لكل مستند)</Label>
              <Textarea
                id="documentsAr"
                value={form.documentsAr}
                onChange={(e) => set('documentsAr', e.target.value)}
                rows={4}
                placeholder="بطاقة الرقم القومي&#10;شهادة الميلاد"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="officeNameAr">اسم المكتب *</Label>
                <Input
                  id="officeNameAr"
                  value={form.officeNameAr}
                  onChange={(e) => set('officeNameAr', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="officePhone">هاتف المكتب *</Label>
                <Input
                  id="officePhone"
                  dir="ltr"
                  value={form.officePhone}
                  onChange={(e) => set('officePhone', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="officeAddressAr">عنوان المكتب *</Label>
              <Input
                id="officeAddressAr"
                value={form.officeAddressAr}
                onChange={(e) => set('officeAddressAr', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enrollmentNotesAr">ملاحظات التسجيل *</Label>
              <Textarea
                id="enrollmentNotesAr"
                value={form.enrollmentNotesAr}
                onChange={(e) => set('enrollmentNotesAr', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الحفظ...
                </>
              ) : editing ? (
                'حفظ التعديلات'
              ) : (
                'إنشاء البرنامج'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
