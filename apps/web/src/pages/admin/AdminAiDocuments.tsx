import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, FilePlus2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminAiBatch,
  useAdminAiDocuments,
  useDeleteAdminAiDocument,
  useUploadAdminAiDocuments,
} from '@/hooks/use-admin';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import type { AiKnowledgeBatchResponse, AiKnowledgeDocument } from '@/services/api';

const MAX_PDF_SIZE_MB = 50;

function formatFileSize(sizeKb: number, locale: string): string {
  if (sizeKb >= 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(sizeKb / 1024)} MB`;
  }

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(sizeKb)} KB`;
}

function getDocumentStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'indexed') {
    return 'default';
  }

  if (status === 'processing' || status === 'pending') {
    return 'secondary';
  }

  if (status === 'failed') {
    return 'destructive';
  }

  return 'outline';
}

function getBatchProgress(batch: AiKnowledgeBatchResponse | undefined, isUploading: boolean): number {
  if (isUploading && !batch) {
    return 12;
  }

  if (!batch || batch.total_files === 0) {
    return 0;
  }

  const completedItems = batch.indexed_files + batch.failed_files;
  if (completedItems === 0 && batch.processing_files > 0) {
    return 40;
  }

  if (completedItems === 0 && batch.pending_files > 0) {
    return 18;
  }

  return Math.min(100, Math.round((completedItems / batch.total_files) * 100));
}

function getBatchStatusCopy(language: AppLanguage, status: string): string {
  if (status === 'completed') {
    return pickLocalizedCopy(language, { ar: 'اكتمل الفهرسة', en: 'Indexing complete' });
  }

  if (status === 'completed_with_errors') {
    return pickLocalizedCopy(language, { ar: 'اكتمل مع أخطاء', en: 'Completed with errors' });
  }

  if (status === 'failed') {
    return pickLocalizedCopy(language, { ar: 'فشل الرفع', en: 'Upload failed' });
  }

  if (status === 'processing') {
    return pickLocalizedCopy(language, { ar: 'جارٍ المعالجة', en: 'Processing' });
  }

  return pickLocalizedCopy(language, { ar: 'في قائمة الانتظار', en: 'Queued' });
}

function getDocumentStatusCopy(language: AppLanguage, status: string): string {
  if (status === 'indexed') {
    return pickLocalizedCopy(language, { ar: 'مفهرس', en: 'Indexed' });
  }

  if (status === 'processing') {
    return pickLocalizedCopy(language, { ar: 'جارٍ المعالجة', en: 'Processing' });
  }

  if (status === 'failed') {
    return pickLocalizedCopy(language, { ar: 'فشل', en: 'Failed' });
  }

  return pickLocalizedCopy(language, { ar: 'قيد الانتظار', en: 'Pending' });
}

export default function AdminAiDocuments() {
  const { language } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const reportedBatchStateRef = useRef<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string>();
  const [deleteCandidate, setDeleteCandidate] = useState<AiKnowledgeDocument | null>(null);

  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';

  const documentsQuery = useAdminAiDocuments({ page: 1, per_page: 100 });
  const batchQuery = useAdminAiBatch(activeBatchId);
  const uploadMutation = useUploadAdminAiDocuments();
  const deleteMutation = useDeleteAdminAiDocument();

  const documents = documentsQuery.data?.documents ?? [];
  const batch = batchQuery.data;
  const batchProgress = getBatchProgress(batch, uploadMutation.isPending);
  const hasDocuments = documents.length > 0;
  const uploadSummary = useMemo(() => {
    if (!batch) {
      return null;
    }

    return pickLocalizedCopy(appLanguage, {
      ar: `تمت فهرسة ${batch.indexed_files} من أصل ${batch.total_files} ملف`,
      en: `${batch.indexed_files} of ${batch.total_files} files indexed`,
    });
  }, [appLanguage, batch]);

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
          pickLocalizedCopy(appLanguage, {
            ar: `اكتملت العملية مع ${batch.failed_files} ملف غير ناجح`,
            en: `Upload finished with ${batch.failed_files} failed file(s)`,
          }),
        );
      } else {
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'أصبحت ملفات PDF متاحة الآن للمساعد الذكي',
            en: 'PDFs are now available to the AI assistant',
          }),
        );
      }
    }

    if (batch.status === 'failed') {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'فشلت عملية تحميل ملفات PDF',
          en: 'PDF upload failed',
        }),
      );
    }

    reportedBatchStateRef.current = batch.status;
  }, [appLanguage, batch, queryClient]);

  const handleOpenPicker = () => {
    inputRef.current?.click();
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const invalidType = files.find((file) => !file.name.toLowerCase().endsWith('.pdf'));
    if (invalidType) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'يُسمح فقط بملفات PDF',
          en: 'Only PDF files are allowed',
        }),
      );
      return;
    }

    const oversized = files.find((file) => file.size > MAX_PDF_SIZE_MB * 1024 * 1024);
    if (oversized) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: `الحد الأقصى لحجم الملف هو ${MAX_PDF_SIZE_MB} ميجابايت`,
          en: `Maximum file size is ${MAX_PDF_SIZE_MB}MB`,
        }),
      );
      return;
    }

    try {
      const response = await uploadMutation.mutateAsync({
        files,
        language: 'auto',
      });
      setActiveBatchId(response.batch_id);
    } catch {
      // The mutation hook already shows a toast; keep the picker reusable.
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteCandidate.doc_id);
      setDeleteCandidate(null);
    } catch {
      // The mutation hook already reports the error to the user.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {pickLocalizedCopy(appLanguage, { ar: 'إدارة معرفة الذكاء الاصطناعي', en: 'AI knowledge management' })}
          </h1>
          <p className="text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'تحميل وحذف ملفات PDF المستخدمة في نظام RAG للمساعد الذكي.',
              en: 'Load and delete the PDFs used by the AI assistant knowledge base.',
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void documentsQuery.refetch()}
            disabled={documentsQuery.isFetching}
          >
            {documentsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {pickLocalizedCopy(appLanguage, { ar: 'تحديث', en: 'Refresh' })}
          </Button>
          <Button type="button" onClick={handleOpenPicker} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
            {pickLocalizedCopy(appLanguage, { ar: 'تحميل PDF', en: 'Load PDF' })}
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
            <Bot className="h-5 w-5" />
            {pickLocalizedCopy(appLanguage, { ar: 'مركز تحكم RAG', en: 'RAG control center' })}
          </CardTitle>
          <CardDescription>
            {pickLocalizedCopy(appLanguage, {
              ar: `يتم قبول ملفات PDF فقط وبحد أقصى ${MAX_PDF_SIZE_MB} ميجابايت لكل ملف.`,
              en: `Only PDF files are accepted, up to ${MAX_PDF_SIZE_MB}MB per file.`,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(uploadMutation.isPending || batch) && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {batch
                      ? getBatchStatusCopy(appLanguage, batch.status)
                      : pickLocalizedCopy(appLanguage, { ar: 'جارٍ رفع الملفات', en: 'Uploading files' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {uploadSummary ??
                      pickLocalizedCopy(appLanguage, {
                        ar: 'يتم إرسال ملفات PDF إلى خدمة الذكاء الاصطناعي.',
                        en: 'Sending PDFs to the AI service.',
                      })}
                  </p>
                </div>
                {batch && (
                  <Badge variant={batch.status === 'failed' ? 'destructive' : 'secondary'}>
                    {batch.total_files}
                  </Badge>
                )}
              </div>
              <Progress value={batchProgress} />
              {batch && (
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>
                    {pickLocalizedCopy(appLanguage, { ar: 'قيد الانتظار', en: 'Queued' })}: {batch.pending_files}
                  </span>
                  <span>
                    {pickLocalizedCopy(appLanguage, { ar: 'جارٍ المعالجة', en: 'Processing' })}: {batch.processing_files}
                  </span>
                  <span>
                    {pickLocalizedCopy(appLanguage, { ar: 'مفهرس', en: 'Indexed' })}: {batch.indexed_files}
                  </span>
                  <span>
                    {pickLocalizedCopy(appLanguage, { ar: 'فشل', en: 'Failed' })}: {batch.failed_files}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'بعد رفع الملف وفهرسته، سيتمكن المساعد من الاستشهاد بمحتواه مباشرة في الإجابات.',
              en: 'After upload and indexing, the assistant can cite this PDF directly in grounded answers.',
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {pickLocalizedCopy(appLanguage, { ar: 'ملفات PDF المحملة', en: 'Loaded PDFs' })}
          </CardTitle>
          <CardDescription>
            {pickLocalizedCopy(appLanguage, {
              ar: 'عرض الملفات الحالية مع حالة الفهرسة والبيانات الأساسية.',
              en: 'Current PDF inventory with indexing status and core metadata.',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {pickLocalizedCopy(appLanguage, { ar: 'جارٍ تحميل الملفات...', en: 'Loading documents...' })}
            </div>
          ) : documentsQuery.error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                {documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : pickLocalizedCopy(appLanguage, {
                      ar: 'تعذر تحميل ملفات المعرفة.',
                      en: 'Could not load AI knowledge documents.',
                    })}
              </p>
              <Button type="button" variant="outline" onClick={() => void documentsQuery.refetch()}>
                {pickLocalizedCopy(appLanguage, { ar: 'إعادة المحاولة', en: 'Try again' })}
              </Button>
            </div>
          ) : !hasDocuments ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد ملفات PDF محملة حاليًا.',
                en: 'No PDFs are loaded yet.',
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الملف', en: 'File' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'تاريخ الرفع', en: 'Uploaded' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحجم', en: 'Size' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الصفحات / المقاطع', en: 'Pages / Chunks' })}</TableHead>
                  <TableHead className="text-end">
                    {pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.doc_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{document.filename}</p>
                        {(document.description || document.error_detail) && (
                          <p className="text-xs text-muted-foreground">
                            {document.error_detail ?? document.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(document.uploaded_at).toLocaleString(locale)}</TableCell>
                    <TableCell>{formatFileSize(document.file_size_kb, locale)}</TableCell>
                    <TableCell>
                      <Badge variant={getDocumentStatusBadgeVariant(document.status)}>
                        {getDocumentStatusCopy(appLanguage, document.status)}
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
                        {pickLocalizedCopy(appLanguage, { ar: 'حذف', en: 'Delete' })}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'تأكيد حذف ملف PDF', en: 'Confirm PDF deletion' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'سيتم حذف الملف من قائمة المعرفة ومن فهارس RAG الخاصة بالمساعد الذكي مباشرة.',
                en: 'This removes the file from the document list and the assistant RAG index immediately.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDelete()}>
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                pickLocalizedCopy(appLanguage, { ar: 'حذف الملف', en: 'Delete PDF' })
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
