// apps/web/src/components/admin/DocumentViewerDialog.tsx
import { useEffect, useState } from 'react';
import { ExternalLink, Download, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

  // Reset zoom when document changes
  useEffect(() => {
    setZoom(1);
  }, [documentUrl]);

  // Strip query string for file type detection (handles S3 signed URLs, CDN tokens)
  const urlPath = documentUrl?.split('?')[0] ?? '';
  const isPdf = urlPath.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(urlPath);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  // Keep Dialog mounted to maintain onOpenChange binding even when documentUrl is null
  if (!documentUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>عرض المستند</DialogTitle>
            <DialogDescription>لا يوجد مستند للعرض</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>عرض المستند - {documentType}</DialogTitle>
          <DialogDescription>مستند {userName}</DialogDescription>
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
              <ExternalLink className="h-4 w-4 ml-2" />
              فتح في تبويب جديد
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={documentUrl} download>
              <Download className="h-4 w-4 ml-2" />
              تحميل
            </a>
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-0 bg-muted/30 rounded-lg p-4">
          {isPdf ? (
            <iframe
              src={documentUrl ?? undefined}
              className="w-full h-full min-h-[500px] rounded border"
              title="Document preview"
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
            />
          ) : isImage ? (
            <div className="flex items-center justify-center h-full">
              <img
                src={documentUrl}
                alt={`${documentType} - ${userName}`}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <p>لا يمكن عرض هذا النوع من الملفات مباشرة</p>
              <Button asChild>
                <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                  فتح الملف
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
