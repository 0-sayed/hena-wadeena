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
import { useTranslation } from 'react-i18next';
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

  const { t } = useTranslation('admin');
  const locale = language === 'en' ? 'en-US' : 'ar-EG';

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
    if (sourceType === 'pdf') return t('ai.source.pdf');
    if (sourceType === 'bootstrap') return t('ai.source.curated');
    if (sourceType === 'copied_doc') return t('ai.source.manual');
    return sourceType;
  };

  const statusLabel = (status: string) => {
    if (status === 'indexed') return t('ai.status.indexed');
    if (status === 'processing') return t('ai.status.processing');
    if (status === 'failed') return t('ai.status.failed');
    return t('ai.status.pending');
  };

  const batchLabel = (status: string) => {
    if (status === 'completed') return t('ai.batch.completed');
    if (status === 'completed_with_errors') return t('ai.batch.completedErrors');
    if (status === 'failed') return t('ai.batch.failed');
    if (status === 'processing') return t('ai.status.processing');
    return t('ai.batch.queued');
  };

  const strategyLabel = (strategy: string | null) => {
    if (strategy === 'llm') return t('ai.strategy.llm');
    if (strategy === 'fallback') return t('ai.strategy.fallback');
    return t('ai.strategy.notGenerated');
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
        toast.error(t('ai.toast.uploadErrors', { failed: batch.failed_files }));
      } else {
        toast.success(t('ai.toast.uploadSuccess'));
      }
    }

    if (batch.status === 'failed') {
        toast.error(t('ai.toast.uploadFailed'));
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
      toast.error(t('ai.pdfLimit'));
      return;
    }

    if (files.some((file) => file.size > MAX_PDF_SIZE_MB * 1024 * 1024)) {
      toast.error(t('ai.pdfSizeLimit', { size: MAX_PDF_SIZE_MB }));
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
      toast.error(t('ai.toast.pasteFirst'));
      return;
    }

    try {
      const response = await composeMutation.mutateAsync({ text: rawText, language: 'ar' });
      setDrafts(response.entries);
      setSelectedDraftIndex(0);
      setLastComposeStrategy(response.strategy);
      setLastFeedSummary(null);
      toast.success(t('ai.toast.prepared', { count: response.entries.length }));
    } catch {
      return;
    }
  };

  const handleFeed = async () => {
    if (drafts.length === 0) {
      toast.error(t('ai.generateFirst'));
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
            {t('ai.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('ai.subtitle')}
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
            {t('ai.refresh')}
          </Button>
          <Button type="button" onClick={openPicker} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="h-4 w-4" />
            )}
            {t('ai.uploadPdf')}
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
            {t('ai.studio')}
          </CardTitle>
          <CardDescription>
            {t('ai.studioDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                {t('ai.preparedSections')}
              </p>
              <p className="mt-2 text-2xl font-semibold">{drafts.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">{t('ai.totalWords')}</p>
              <p className="mt-2 text-2xl font-semibold">
                {new Intl.NumberFormat(locale).format(totalDraftWords)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                {t('ai.splitStrategy')}
              </p>
              <p className="mt-2 text-sm font-semibold">{strategyLabel(lastComposeStrategy)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                {t('ai.existingCurated')}
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
                placeholder={t('ai.pastePlaceholder')}
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
                  {t('ai.generateSlugs')}
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
                  {t('ai.reset')}
                </Button>
              </div>

              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {t('ai.tip')}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium">{t('ai.selectedSection')}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDraft
                    ? t('ai.editBeforeFeed')
                    : t('ai.generateFirst')}
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
                    {t('ai.words')}:{' '}
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
                    {t('ai.feedChatbot')}
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  {t('ai.selectedPlaceholder')}
                </div>
              )}
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="rounded-xl border">
              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_88px] gap-3 bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>{t('ai.table.section')}</span>
                <span>Slug</span>
                <span className="text-end">{t('ai.table.words')}</span>
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
              <p className="font-medium">{t('ai.latestFeed')}</p>
              <p className="mt-1 text-muted-foreground">
                {t('ai.feedResult', {
                  indexed: lastFeedSummary.indexed_entries,
                  failed: lastFeedSummary.failed_entries
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('ai.pipeline')}
          </CardTitle>
          <CardDescription>
            {t('ai.pipelineDesc', { size: MAX_PDF_SIZE_MB })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(uploadMutation.isPending || batch) && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {batch ? batchLabel(batch.status) : t('ai.uploading')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {batch
                      ? t('ai.indexedProgress', {
                          indexed: batch.indexed_files,
                          total: batch.total_files
                        })
                      : t('ai.sendingFiles')}
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
            {t('ai.pdfTip')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('ai.knowledgeSources')}</CardTitle>
          <CardDescription>
            {t('ai.knowledgeSourcesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('ai.loadingSources')}
            </div>
          ) : documentsQuery.error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                {documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : t('ai.loadError')}
              </p>
              <Button type="button" variant="outline" onClick={() => void documentsQuery.refetch()}>
                {t('ai.tryAgain')}
              </Button>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {t('ai.noSources')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ai.table.source')}</TableHead>
                  <TableHead>{t('ai.table.type')}</TableHead>
                  <TableHead>{t('ai.table.uploaded')}</TableHead>
                  <TableHead>{t('ai.table.size')}</TableHead>
                  <TableHead>{t('ai.table.status')}</TableHead>
                  <TableHead>{t('ai.table.pagesChunks')}</TableHead>
                  <TableHead className="text-end">{t('ai.table.actions')}</TableHead>
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
                        {t('ai.table.delete')}
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
              {t('ai.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('ai.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('ai.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('ai.deleteAction')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
