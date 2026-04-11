import { useEffect, useState } from 'react';
import { Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string | null;
  documentType: string;
  userName: string;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  documentUrl,
  documentType,
  userName,
}: DocumentViewerDialogProps) {
  const [zoom, setZoom] = useState(1);
  const { t } = useTranslation('admin');

  useEffect(() => {
    setZoom(1);
  }, [documentUrl]);

  const urlPath = documentUrl?.split('?')[0] ?? '';
  const isDataUrl = documentUrl?.startsWith('data:') ?? false;
  const isPdf = isDataUrl
    ? documentUrl?.startsWith('data:application/pdf') ?? false
    : urlPath.toLowerCase().endsWith('.pdf');
  const isImage = isDataUrl
    ? documentUrl?.startsWith('data:image/') ?? false
    : /\.(jpg|jpeg|png|gif|webp)$/i.test(urlPath);

  const title = t('documentViewer.title');
  const emptyState = t('documentViewer.emptyState');
  const openInNewTab = t('documentViewer.openInNewTab');
  const download = t('documentViewer.download');
  const unsupportedFile = t('documentViewer.unsupportedFile');
  const openFile = t('documentViewer.openFile');
  const userDocumentDescription = t('documentViewer.userDocument', { userName });
  const previewTitle = t('documentViewer.previewTitle');

  const handleZoomIn = () => setZoom((currentZoom) => Math.min(currentZoom + 0.25, 3));
  const handleZoomOut = () => setZoom((currentZoom) => Math.max(currentZoom - 0.25, 0.5));

  if (!documentUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{emptyState}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {title} - {documentType}
          </DialogTitle>
          <DialogDescription>{userDocumentDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b pb-3">
          {isImage && (
            <>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" asChild>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="ms-2 h-4 w-4" />
              {openInNewTab}
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={documentUrl} download>
              <Download className="ms-2 h-4 w-4" />
              {download}
            </a>
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted/30 p-4">
          {isPdf ? (
            <iframe
              src={documentUrl ?? undefined}
              className="h-full min-h-[500px] w-full rounded border"
              title={previewTitle}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
            />
          ) : isImage ? (
            <div className="flex h-full items-center justify-center">
              <img
                src={documentUrl}
                alt={`${documentType} - ${userName}`}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
              <p>{unsupportedFile}</p>
              <Button asChild>
                <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                  {openFile}
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
