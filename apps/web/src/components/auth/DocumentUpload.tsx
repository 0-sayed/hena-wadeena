import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  label: string;
  uploadedFile?: File;
  onUpload: (file: File) => void;
}

export function DocumentUpload({ label, uploadedFile, onUpload }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('يرجى رفع صورة (JPG, PNG, WebP) أو ملف PDF');
        return;
      }
      onUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label} *</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadedFile ? (
        <div className="flex items-center justify-between p-4 rounded-lg border border-primary/50 bg-primary/5">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(1)} كيلوبايت
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            تغيير
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed flex flex-col gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">انقر لرفع {label}</span>
          <span className="text-xs text-muted-foreground">(JPG, PNG, PDF - حتى 5MB)</span>
        </Button>
      )}
    </div>
  );
}
