import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useSubmitInquiry } from '@/hooks/use-artisans';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const inquirySchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'رقم هاتف غير صالح'),
  message: z.string().optional(),
  quantity: z.coerce.number().int().min(1).optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

interface InquiryFormProps {
  productId: string;
  productName: string;
  minOrderQty: number;
  onSuccess?: () => void;
}

export function InquiryForm({ productId, productName, minOrderQty, onSuccess }: InquiryFormProps) {
  const submitInquiry = useSubmitInquiry();

  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
      quantity: minOrderQty,
    },
  });

  const onSubmit = async (data: InquiryFormData) => {
    try {
      await submitInquiry.mutateAsync({
        productId,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        message: data.message || undefined,
        quantity: data.quantity,
      });

      toast.success('تم إرسال الاستفسار', {
        description: `سيتواصل معك صاحب المنتج "${productName}" قريباً`,
      });

      form.reset();
      onSuccess?.();
    } catch {
      toast.error('حدث خطأ', {
        description: 'فشل إرسال الاستفسار، يرجى المحاولة مرة أخرى',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم</FormLabel>
              <FormControl>
                <Input placeholder="أدخل اسمك" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رقم الهاتف</FormLabel>
              <FormControl>
                <Input placeholder="+201234567890" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>البريد الإلكتروني (اختياري)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="example@email.com" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الكمية المطلوبة</FormLabel>
              <FormControl>
                <Input type="number" min={minOrderQty} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رسالة إضافية (اختياري)</FormLabel>
              <FormControl>
                <Textarea placeholder="أي تفاصيل إضافية تريد إضافتها..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={submitInquiry.isPending}>
          {submitInquiry.isPending ? 'جاري الإرسال...' : 'إرسال الاستفسار'}
        </Button>
      </form>
    </Form>
  );
}
