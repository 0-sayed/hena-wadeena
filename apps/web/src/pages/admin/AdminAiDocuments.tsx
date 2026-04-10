import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, FilePlus2, Loader2, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  useAdminAiBatch,
  useAdminAiDocuments,
  useComposeAdminAiCuratedText,
  useDeleteAdminAiDocument,
  useFeedAdminAiCuratedText,
  useUploadAdminAiDocuments,
} from '@/hooks/use-admin';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import type {
  AiCuratedKnowledgeEntry,
  AiCuratedKnowledgeFeedResponse,
  AiKnowledgeBatchResponse,
  AiKnowledgeDocument,
} from '@/services/api';

const MAX_PDF_SIZE_MB = 50;

function formatFileSize(sizeKb: number, locale: string) {
  if (sizeKb >= 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(sizeKb / 1024)} MB`;
  }

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(sizeKb)} KB`;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function slugifyText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s-]+/gu, '-')
    .replace(/^-|-$/g, '');
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'indexed') return 'default';
  if (status === 'processing' || status === 'pending') return 'secondary';
  if (status === 'failed') return 'destructive';
  return 'outline';
}

function getBatchProgress(batch: AiKnowledgeBatchResponse | undefined, isUploading: boolean) {
  if (isUploading && !batch) return 12;
  if (!batch || batch.total_files === 0) return 0;
  const completed = batch.indexed_files + batch.failed_files;
  if (completed === 0 && batch.processing_files > 0) return 40;
  if (completed === 0 && batch.pending_files > 0) return 18;
  return Math.min(100, Math.round((completed / batch.total_files) * 100));
}

export default function AdminAiDocuments() {
  const { language } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const reportedBatchStateRef = useRef<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string>();
  const [deleteCandidate, setDeleteCandidate] = useState<AiKnowledgeDocument | null>(null);
  const [rawText, setRawText] = useState('');
  const [drafts, setDrafts] = useState<AiCuratedKnowledgeEntry[]>([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const [lastComposeStrategy, setLastComposeStrategy] = useState<string | null>(null);
  const [lastFeedSummary, setLastFeedSummary] = useState<AiCuratedKnowledgeFeedResponse | null>(
    null,
  );

  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';
  const t = useMemo(
    () => (ar: string, en: string) => pickLocalizedCopy(appLanguage, { ar, en }),
    [appLanguage],
  );

  const documentsQuery = useAdminAiDocuments({ page: 1, per_page: 100 });
  const batchQuery = useAdminAiBatch(activeBatchId);
  const uploadMutation = useUploadAdminAiDocuments();
  const deleteMutation = useDeleteAdminAiDocument();
  const composeMutation = useComposeAdminAiCuratedText();
  const feedMutation = useFeedAdminAiCuratedText();

  const documents = documentsQuery.data?.documents ?? [];
  const batch = batchQuery.data;
  const selectedDraft = drafts[selectedDraftIndex] ?? null;
  const curatedSourcesCount = documents.filter(
    (document) => document.source_type === 'bootstrap',
  ).length;
  const totalDraftWords = useMemo(
    () => drafts.reduce((sum, draft) => sum + countWords(draft.content), 0),
    [drafts],
  );

  const sourceLabel = (sourceType: string) => {
    if (sourceType === 'pdf') return 'PDF';
    if (sourceType === 'bootstrap') return t('نص منظم', 'Curated text');
    if (sourceType === 'copied_doc') return t('نص يدوي', 'Manual text');
    return sourceType;
  };

  const statusLabel = (status: string) => {
    if (status === 'indexed') return t('مفهرس', 'Indexed');
    if (status === 'processing') return t('جارٍ المعالجة', 'Processing');
    if (status === 'failed') return t('فشل', 'Failed');
    return t('قيد الانتظار', 'Pending');
  };

  const batchLabel = (status: string) => {
    if (status === 'completed') return t('اكتمل الفهرسة', 'Indexing complete');
    if (status === 'completed_with_errors') return t('اكتمل مع أخطاء', 'Completed with errors');
    if (status === 'failed') return t('فشل الرفع', 'Upload failed');
    if (status === 'processing') return t('جارٍ المعالجة', 'Processing');
    return t('في قائمة الانتظار', 'Queued');
  };

  const strategyLabel = (strategy: string | null) => {
    if (strategy === 'llm') return t('مقسّم بالـ LLM', 'Composed with the LLM');
    if (strategy === 'fallback') return t('تقسيم احتياطي', 'Fallback split');
    return t('لم يتم التوليد بعد', 'Not generated yet');
  };

  useEffect(() => {
    reportedBatchStateRef.current = null;
  }, [activeBatchId]);

  useEffect(() => {
    if (!batch || reportedBatchStateRef.current === batch.status) {
      return;
    }

    if (batch.status === 'completed' || batch.status === 'completed_with_errors') {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'documents'] });
      if (batch.failed_files > 0) {
        toast.error(
          t(
            `اكتملت العملية مع ${batch.failed_files} ملف غير ناجح`,
            `Upload finished with ${batch.failed_files} failed file(s)`,
          ),
        );
      } else {
        toast.success(
          t('أصبحت ملفات PDF متاحة الآن للشات بوت', 'PDFs are now available to the chatbot'),
        );
      }
    }

    if (batch.status === 'failed') {
      toast.error(t('فشلت عملية تحميل ملفات PDF', 'PDF upload failed'));
    }

    reportedBatchStateRef.current = batch.status;
  }, [batch, queryClient, t]);

  useEffect(() => {
    if (selectedDraftIndex >= drafts.length) {
      setSelectedDraftIndex(0);
    }
  }, [drafts.length, selectedDraftIndex]);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    if (files.some((file) => !file.name.toLowerCase().endsWith('.pdf'))) {
      toast.error(t('يُسمح فقط بملفات PDF', 'Only PDF files are allowed'));
      return;
    }

    if (files.some((file) => file.size > MAX_PDF_SIZE_MB * 1024 * 1024)) {
      toast.error(
        t(`الحد الأقصى ${MAX_PDF_SIZE_MB} ميجابايت`, `Maximum file size is ${MAX_PDF_SIZE_MB}MB`),
      );
      return;
    }

    try {
      const response = await uploadMutation.mutateAsync({ files, language: 'auto' });
      setActiveBatchId(response.batch_id);
    } catch {
      return;
    }
  };

  const updateDraft = (index: number, patch: Partial<AiCuratedKnowledgeEntry>) => {
    setDrafts((current) =>
      current.map((draft, currentIndex) =>
        currentIndex === index ? { ...draft, ...patch } : draft,
      ),
    );
  };

  const normalizeDrafts = (entries: AiCuratedKnowledgeEntry[]) => {
    const seen = new Set<string>();

    return entries.map((entry, index) => {
      const baseSlug =
        slugifyText(entry.slug) || slugifyText(entry.title) || `section-${index + 1}`;
      let nextSlug = baseSlug;
      let suffix = 2;

      while (seen.has(nextSlug)) {
        nextSlug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      seen.add(nextSlug);
      return { ...entry, slug: nextSlug };
    });
  };

  const handleCompose = async () => {
    if (!rawText.trim()) {
      toast.error(t('ألصق النص أولاً', 'Paste the text first'));
      return;
    }

    try {
      const response = await composeMutation.mutateAsync({ text: rawText, language: 'ar' });
      setDrafts(response.entries);
      setSelectedDraftIndex(0);
      setLastComposeStrategy(response.strategy);
      setLastFeedSummary(null);
      toast.success(
        t(
          `تم تجهيز ${response.entries.length} فقرة للمراجعة`,
          `Prepared ${response.entries.length} sections for review`,
        ),
      );
    } catch {
      return;
    }
  };

  const handleFeed = async () => {
    if (drafts.length === 0) {
      toast.error(t('أنشئ الفقرات أولاً', 'Generate sections first'));
      return;
    }

    const normalizedEntries = normalizeDrafts(drafts);
    setDrafts(normalizedEntries);

    try {
      const response = await feedMutation.mutateAsync({ entries: normalizedEntries });
      setLastFeedSummary(response);
      void documentsQuery.refetch();
    } catch {
      return;
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteCandidate.doc_id);
      setDeleteCandidate(null);
    } catch {
      return;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('إدارة معرفة الذكاء الاصطناعي', 'AI knowledge management')}
          </h1>
          <p className="text-muted-foreground">
            {t(
              'حوّل النصوص الطويلة إلى فقرات معرفة منظمة للشات بوت، مع الإبقاء على رفع ملفات PDF المرجعية.',
              'Turn long texts into curated chatbot knowledge while keeping the reference PDF flow.',
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void documentsQuery.refetch()}
            disabled={documentsQuery.isFetching}
          >
            {documentsQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t('تحديث', 'Refresh')}
          </Button>
          <Button type="button" onClick={openPicker} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="h-4 w-4" />
            )}
            {t('تحميل PDF', 'Upload PDF')}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(event) => void handleFilesSelected(event)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('استوديو RAG', 'RAG studio')}
          </CardTitle>
          <CardDescription>
            {t(
              'ألصق تقريرًا طويلًا، راجع الـ slugs المقترحة، ثم اضغط تغذية الشات بوت.',
              'Paste a long report, review the generated slugs, then feed the chatbot.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                {t('الفقرات الجاهزة', 'Prepared sections')}
              </p>
              <p className="mt-2 text-2xl font-semibold">{drafts.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">{t('إجمالي الكلمات', 'Total words')}</p>
              <p className="mt-2 text-2xl font-semibold">
                {new Intl.NumberFormat(locale).format(totalDraftWords)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                {t('طريقة التقسيم', 'Split strategy')}
              </p>
              <p className="mt-2 text-sm font-semibold">{strategyLabel(lastComposeStrategy)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                {t('مصادر منظمة حالية', 'Existing curated sources')}
              </p>
              <p className="mt-2 text-2xl font-semibold">{curatedSourcesCount}</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <Textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                className="min-h-[280px]"
                placeholder={t(
                  'ألصق التقرير أو النص الكبير هنا...',
                  'Paste the report or long text here...',
                )}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleCompose()}
                  disabled={composeMutation.isPending || feedMutation.isPending}
                >
                  {composeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t('توليد Slugs تلقائيًا', 'Generate slugs automatically')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRawText('');
                    setDrafts([]);
                    setSelectedDraftIndex(0);
                    setLastComposeStrategy(null);
                    setLastFeedSummary(null);
                  }}
                  disabled={composeMutation.isPending || feedMutation.isPending}
                >
                  {t('إعادة ضبط', 'Reset')}
                </Button>
              </div>

              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {t(
                  'الزر النهائي يعيد فهرسة كل slug عبر نفس مسار الإدخال المنظم المستخدم سابقًا في التغذية التلقائية، لكن الآن من لوحة الإدارة فقط.',
                  'The final action re-indexes every slug through the same curated ingestion path that used to run at startup, now only from the admin dashboard.',
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium">{t('الفقرة المحددة', 'Selected section')}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDraft
                    ? t(
                        'عدّل الـ slug أو المحتوى قبل التغذية.',
                        'Edit the slug or content before feeding.',
                      )
                    : t('أنشئ الفقرات أولاً.', 'Generate sections first.')}
                </p>
              </div>

              {selectedDraft ? (
                <>
                  <Input
                    dir="ltr"
                    value={selectedDraft.slug}
                    onChange={(event) =>
                      updateDraft(selectedDraftIndex, { slug: event.target.value })
                    }
                    onBlur={(event) =>
                      updateDraft(selectedDraftIndex, {
                        slug:
                          slugifyText(event.target.value) ||
                          slugifyText(selectedDraft.title) ||
                          `section-${selectedDraftIndex + 1}`,
                      })
                    }
                  />
                  <Input
                    value={selectedDraft.title}
                    onChange={(event) =>
                      updateDraft(selectedDraftIndex, { title: event.target.value })
                    }
                  />
                  <Textarea
                    value={selectedDraft.content}
                    className="min-h-[260px]"
                    onChange={(event) =>
                      updateDraft(selectedDraftIndex, { content: event.target.value })
                    }
                  />
                  <div className="text-sm text-muted-foreground">
                    {t('الكلمات', 'Words')}:{' '}
                    {new Intl.NumberFormat(locale).format(countWords(selectedDraft.content))}
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => void handleFeed()}
                    disabled={feedMutation.isPending || composeMutation.isPending}
                  >
                    {feedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    {t('تغذية الشات بوت', 'Feed the chatbot')}
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  {t(
                    'ستظهر هنا الفقرة المحددة بعد التوليد.',
                    'The selected section will appear here after generation.',
                  )}
                </div>
              )}
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="rounded-xl border">
              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_88px] gap-3 bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>{t('الفقرة', 'Section')}</span>
                <span>Slug</span>
                <span className="text-end">{t('كلمات', 'Words')}</span>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {drafts.map((draft, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_88px] gap-3 border-t px-4 py-3 ${selectedDraftIndex === index ? 'bg-muted/50' : 'bg-background'}`}
                    onClick={() => setSelectedDraftIndex(index)}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{draft.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{draft.description}</p>
                    </div>
                    <Input
                      dir="ltr"
                      value={draft.slug}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(index, { slug: event.target.value })}
                      onBlur={(event) =>
                        updateDraft(index, {
                          slug:
                            slugifyText(event.target.value) ||
                            slugifyText(draft.title) ||
                            `section-${index + 1}`,
                        })
                      }
                    />
                    <div className="text-end text-sm text-muted-foreground">
                      {new Intl.NumberFormat(locale).format(countWords(draft.content))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastFeedSummary && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{t('آخر عملية تغذية', 'Latest feed run')}</p>
              <p className="mt-1 text-muted-foreground">
                {t(
                  `تم فهرسة ${lastFeedSummary.indexed_entries} فقرة، وفشل ${lastFeedSummary.failed_entries}.`,
                  `Indexed ${lastFeedSummary.indexed_entries} section(s), failed ${lastFeedSummary.failed_entries}.`,
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('مسار ملفات PDF', 'PDF pipeline')}
          </CardTitle>
          <CardDescription>
            {t(
              `ملفات PDF فقط وبحد أقصى ${MAX_PDF_SIZE_MB} ميجابايت لكل ملف.`,
              `PDF only, up to ${MAX_PDF_SIZE_MB}MB per file.`,
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(uploadMutation.isPending || batch) && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {batch ? batchLabel(batch.status) : t('جارٍ رفع الملفات', 'Uploading files')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {batch
                      ? t(
                          `تمت فهرسة ${batch.indexed_files} من أصل ${batch.total_files} ملف`,
                          `${batch.indexed_files} of ${batch.total_files} files indexed`,
                        )
                      : t(
                          'يتم إرسال الملفات إلى خدمة الذكاء الاصطناعي.',
                          'Sending files to the AI service.',
                        )}
                  </p>
                </div>
                {batch && (
                  <Badge variant={batch.status === 'failed' ? 'destructive' : 'secondary'}>
                    {batch.total_files}
                  </Badge>
                )}
              </div>
              <Progress value={getBatchProgress(batch, uploadMutation.isPending)} />
            </div>
          )}

          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t(
              'سيظهر الـ PDF بجانب المصادر النصية المنظمة في نفس inventory.',
              'PDFs appear beside curated text sources in the same inventory.',
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('مصادر المعرفة الحالية', 'Current knowledge sources')}</CardTitle>
          <CardDescription>
            {t(
              'كل المصادر الحالية مع النوع، الحالة، والبيانات الأساسية.',
              'All current sources with type, status, and core metadata.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('جارٍ تحميل المصادر...', 'Loading sources...')}
            </div>
          ) : documentsQuery.error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                {documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : t('تعذر تحميل المصادر.', 'Could not load sources.')}
              </p>
              <Button type="button" variant="outline" onClick={() => void documentsQuery.refetch()}>
                {t('إعادة المحاولة', 'Try again')}
              </Button>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {t('لا توجد مصادر معرفة محمّلة حاليًا.', 'No knowledge sources are loaded yet.')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('المصدر', 'Source')}</TableHead>
                  <TableHead>{t('النوع', 'Type')}</TableHead>
                  <TableHead>{t('تاريخ الرفع', 'Uploaded')}</TableHead>
                  <TableHead>{t('الحجم', 'Size')}</TableHead>
                  <TableHead>{t('الحالة', 'Status')}</TableHead>
                  <TableHead>{t('الصفحات / المقاطع', 'Pages / Chunks')}</TableHead>
                  <TableHead className="text-end">{t('الإجراءات', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.doc_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{document.title?.trim() || document.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {document.description ||
                            (document.title?.trim()
                              ? document.filename
                              : document.error_detail || '')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceLabel(document.source_type)}</Badge>
                    </TableCell>
                    <TableCell>{new Date(document.uploaded_at).toLocaleString(locale)}</TableCell>
                    <TableCell>{formatFileSize(document.file_size_kb, locale)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(document.status)}>
                        {statusLabel(document.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {document.total_pages} / {document.total_chunks}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={document.status === 'processing' || deleteMutation.isPending}
                        onClick={() => setDeleteCandidate(document)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('حذف', 'Delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('تأكيد حذف مصدر المعرفة', 'Confirm knowledge source deletion')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'سيتم حذف هذا المصدر من القائمة ومن فهارس RAG الخاصة بالشات بوت مباشرة.',
                'This removes the source from the list and the chatbot RAG index immediately.',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('حذف المصدر', 'Delete source')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
