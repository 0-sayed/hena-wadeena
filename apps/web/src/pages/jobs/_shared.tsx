import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitReviewMutation } from '@/hooks/use-jobs';

export function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-yellow-400 hover:text-yellow-500 transition-colors"
        >
          <Star className={`h-6 w-6 ${star <= value ? 'fill-current' : ''}`} />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  jobId,
  appId,
  label,
  onDone,
}: {
  jobId: string;
  appId: string;
  label: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const submitMutation = useSubmitReviewMutation(jobId, appId);

  async function handleSubmit() {
    try {
      await submitMutation.mutateAsync({ rating, comment: comment.trim() || undefined });
      toast.success('تم إرسال تقييمك');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر إرسال التقييم');
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
      <p className="text-sm font-medium">{label}</p>
      <StarRating value={rating} onChange={setRating} />
      <Textarea
        placeholder="تعليق (اختياري)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void handleSubmit()} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'جارٍ...' : 'إرسال التقييم'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
