import { AlertCircle } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { useEffect, useRef } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FormErrorAlertProps extends HTMLAttributes<HTMLDivElement> {
  message: string;
}

export function FormErrorAlert({ message, className, ...props }: FormErrorAlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alertRef.current?.focus();
  }, [message]);

  return (
    <Alert
      ref={alertRef}
      variant="destructive"
      tabIndex={-1}
      aria-live="polite"
      aria-atomic="true"
      className={cn('border-destructive/30 bg-destructive/5 text-sm shadow-sm', className)}
      {...props}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-sm leading-6">{message}</AlertDescription>
    </Alert>
  );
}

interface FieldErrorTextProps extends HTMLAttributes<HTMLParagraphElement> {
  id: string;
  message?: string;
}

export function FieldErrorText({ id, message, className, ...props }: FieldErrorTextProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      aria-live="polite"
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {message}
    </p>
  );
}
