import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import {
  appendErrors,
  type FieldError,
  type Resolver,
  useForm,
} from 'react-hook-form';
import { toast } from 'sonner';
import { ZodError, z } from 'zod';

import { useSubmitInquiry } from '@/hooks/use-artisans';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const inquirySchemaBase = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'رقم هاتف غير صالح'),
  message: z.string().optional(),
  quantity: z.coerce.number().int().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchemaBase>;

function createInquirySchema(minOrderQty: number) {
  return inquirySchemaBase.extend({
    quantity: z.coerce
      .number()
      .int()
      .min(minOrderQty, `الحد الأدنى للطلب هو ${minOrderQty}`)
      .optional(),
  });
}

function parseInquiryErrorSchema(
  zodErrors: z.ZodIssue[],
  validateAllFieldCriteria: boolean,
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};

  for (; zodErrors.length; ) {
    const error = zodErrors[0];
    const { code, message, path } = error;
    const fieldPath = path.join('.');

    if (!errors[fieldPath]) {
      if ('unionErrors' in error) {
        const unionError = error.unionErrors[0]?.errors[0];

        errors[fieldPath] = {
          message: unionError?.message ?? message,
          type: unionError?.code ?? code,
        };
      } else {
        errors[fieldPath] = { message, type: code };
      }
    }

    if ('unionErrors' in error) {
      error.unionErrors.forEach((unionError) =>
        unionError.errors.forEach((nestedError) => zodErrors.push(nestedError)),
      );
    }

    if (validateAllFieldCriteria) {
      const messages = errors[fieldPath].types?.[error.code];

      errors[fieldPath] = appendErrors(
        fieldPath,
        validateAllFieldCriteria,
        errors,
        code,
        messages
          ? ([] as string[]).concat(messages as string[], error.message)
          : error.message,
      ) as FieldError;
    }

    zodErrors.shift();
  }

  return errors;
}

function createInquiryResolver(inquirySchema: z.ZodType<InquiryFormData>): Resolver<InquiryFormData> {
  return async (values, _, options) => {
    try {
      const parsedValues = await inquirySchema.parseAsync(values);

      if (options.shouldUseNativeValidation) {
        validateFieldsNatively({}, options);
      }

      return {
        values: parsedValues,
        errors: {},
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          values: {},
          errors: toNestErrors(
            parseInquiryErrorSchema(
              error.errors,
              !options.shouldUseNativeValidation && options.criteriaMode === 'all',
            ),
            options,
          ),
        };
      }

      throw error;
    }
  };
}

interface InquiryFormProps {
  productId: string;
  productName: string;
  minOrderQty: number;
  onSuccess?: () => void;
}

export function InquiryForm({ productId, productName, minOrderQty, onSuccess }: InquiryFormProps) {
  const submitInquiry = useSubmitInquiry();
  const inquirySchema = createInquirySchema(minOrderQty);

  const form = useForm<InquiryFormData>({
    resolver: createInquiryResolver(inquirySchema),
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
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-4">
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
