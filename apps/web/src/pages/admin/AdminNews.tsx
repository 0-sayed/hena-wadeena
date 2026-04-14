// apps/web/src/pages/admin/AdminNews.tsx
import { useState } from 'react';
import { Eye, EyeOff, ImageIcon, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import {
  useAdminCreateNews,
  useAdminDeleteNews,
  useAdminNewsList,
  useAdminPublishNews,
  useAdminUpdateNews,
} from '@/hooks/use-news';
import { newsAPI } from '@/services/api';
import type { NewsArticle } from '@hena-wadeena/types';
import { NewsCategory } from '@hena-wadeena/types';
import {
  NEWS_CATEGORY_COLORS,
  NEWS_CATEGORY_LABELS,
  NEWS_CATEGORY_OPTIONS,
  formatNewsDate,
} from '@/lib/news-utils';

interface ArticleFormData {
  titleAr: string;
  summaryAr: string;
  contentAr: string;
  category: NewsCategory;
  authorName: string;
  coverImage: string;
}

const EMPTY_FORM: ArticleFormData = {
  titleAr: '',
  summaryAr: '',
  contentAr: '',
  category: NewsCategory.ANNOUNCEMENT,
  authorName: '',
  coverImage: '',
};

const LIMIT = 20;

export default function AdminNews() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useAdminNewsList({ offset, limit: LIMIT });

  const createMutation = useAdminCreateNews();
  const publishMutation = useAdminPublishNews();
  const deleteMutation = useAdminDeleteNews();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [form, setForm] = useState<ArticleFormData>(EMPTY_FORM);

  const updateMutation = useAdminUpdateNews();

  const [uploading, setUploading] = useState(false);

  async function handleImageFile(file: File) {
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!ALLOWED.has(file.type)) {
      toast.error('يُسمح بصيغ JPEG وPNG وWebP فقط');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
      return;
    }
    setUploading(true);
    try {
      const { uploadUrl } = await newsAPI.adminUploadImage({
        filename: file.name,
        contentType: file.type,
      });
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`S3 ${res.status}`);
      handleFormChange('coverImage', uploadUrl.split('?')[0]);
    } catch {
      toast.error('فشل رفع الصورة — تحقق من إعداد S3');
    } finally {
      setUploading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(article: NewsArticle) {
    setEditing(article);
    setForm({
      titleAr: article.titleAr,
      summaryAr: article.summaryAr,
      contentAr: article.contentAr,
      category: article.category,
      authorName: article.authorName,
      coverImage: article.coverImage ?? '',
    });
    setDialogOpen(true);
  }

  function handleFormChange<K extends keyof ArticleFormData>(field: K, value: ArticleFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    const payload = {
      titleAr: form.titleAr.trim(),
      summaryAr: form.summaryAr.trim(),
      contentAr: form.contentAr.trim(),
      category: form.category,
      authorName: form.authorName.trim(),
      coverImage: form.coverImage.trim() || undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body: payload });
        toast.success('تم تحديث المقال');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('تم إنشاء المقال');
      }
      setDialogOpen(false);
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
  }

  async function handleTogglePublish(article: NewsArticle) {
    // Toast uses article.isPublished at click time (before the server flips it)
    try {
      await publishMutation.mutateAsync(article.id);
      toast.success(article.isPublished ? 'تم إلغاء النشر' : 'تم النشر');
    } catch {
      toast.error('حدث خطأ');
    }
  }

  async function handleDelete(article: NewsArticle) {
    if (!window.confirm(`هل تريد حذف "${article.titleAr}"؟`)) return;
    try {
      await deleteMutation.mutateAsync(article.id);
      toast.success('تم الحذف');
    } catch {
      toast.error('حدث خطأ');
    }
  }

  const total = data?.total ?? 0;
  const hasMore = offset + LIMIT < total;
  const hasPrev = offset > 0;
  const isSaving = createMutation.isPending || updateMutation.isPending || uploading;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأخبار</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          مقال جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">الكاتب</TableHead>
                <TableHead className="text-right">وقت القراءة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">تاريخ النشر</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="max-w-xs truncate font-medium">{article.titleAr}</TableCell>
                  <TableCell>
                    <Badge className={NEWS_CATEGORY_COLORS[article.category]}>
                      {NEWS_CATEGORY_LABELS[article.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{article.authorName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {article.readingTimeMinutes} د
                  </TableCell>
                  <TableCell>
                    <Badge variant={article.isPublished ? 'default' : 'secondary'}>
                      {article.isPublished ? 'منشور' : 'مسودة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatNewsDate(article.publishedAt, { monthFormat: 'short', nullValue: '—' })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={article.isPublished ? 'إلغاء النشر' : 'نشر'}
                        onClick={() => void handleTogglePublish(article)}
                      >
                        {article.isPublished ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="تعديل"
                        onClick={() => openEdit(article)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="حذف"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(article)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    لا توجد مقالات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {total > LIMIT && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={!hasPrev}
                onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                {offset + 1}–{Math.min(offset + LIMIT, total)} من {total}
              </span>
              <Button
                variant="outline"
                disabled={!hasMore}
                onClick={() => setOffset((o) => o + LIMIT)}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل المقال' : 'إنشاء مقال جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titleAr">العنوان *</Label>
              <Input
                id="titleAr"
                value={form.titleAr}
                onChange={(e) => handleFormChange('titleAr', e.target.value)}
                placeholder="عنوان المقال"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">التصنيف *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => handleFormChange('category', v as NewsCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEWS_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="authorName">الكاتب *</Label>
              <Input
                id="authorName"
                value={form.authorName}
                onChange={(e) => handleFormChange('authorName', e.target.value)}
                placeholder="اسم الكاتب"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="summaryAr">الملخص * (10–300 حرف)</Label>
              <Textarea
                id="summaryAr"
                value={form.summaryAr}
                onChange={(e) => handleFormChange('summaryAr', e.target.value)}
                placeholder="ملخص قصير يظهر في قائمة المقالات"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contentAr">المحتوى * (50 حرف على الأقل)</Label>
              <Textarea
                id="contentAr"
                value={form.contentAr}
                onChange={(e) => handleFormChange('contentAr', e.target.value)}
                placeholder="محتوى المقال الكامل"
                rows={12}
              />
            </div>

            <div className="space-y-1.5">
              <Label>صورة الغلاف (اختياري)</Label>
              {form.coverImage ? (
                <div className="relative overflow-hidden rounded-lg border">
                  <img
                    src={form.coverImage}
                    alt=""
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() => handleFormChange('coverImage', '')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-14 transition-colors hover:border-primary/50 hover:bg-muted/50 ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploading ? 'جارٍ الرفع...' : 'اضغط لاختيار صورة'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageFile(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSaving}>
              {isSaving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إنشاء المقال'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
