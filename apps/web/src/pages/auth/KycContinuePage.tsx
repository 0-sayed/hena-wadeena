import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { KycDocType } from '@hena-wadeena/types';
import { AlertCircle, CheckCircle2, FileBadge2, FileUp, Hourglass } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { kycOnboardingAPI } from '@/services/api';
import type { KycOnboardingSession, KycOnboardingSubmission } from '@/services/api';
import { clearKycSessionToken, getKycSessionToken } from '@/services/kyc-session-manager';

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const documentLabels: Record<string, string> = {
  [KycDocType.NATIONAL_ID]: 'بطاقة الرقم القومي',
  [KycDocType.STUDENT_ID]: 'بطاقة الطالب',
  [KycDocType.GUIDE_LICENSE]: 'رخصة الإرشاد',
  [KycDocType.COMMERCIAL_REGISTER]: 'السجل التجاري',
  [KycDocType.BUSINESS_DOCUMENT]: 'مستند تجاري',
};

const statusLabels: Record<KycOnboardingSubmission['status'], string> = {
  pending: 'قيد الانتظار',
  under_review: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }

      reject(new Error('تعذر قراءة الملف'));
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

function getLatestSubmission(
  submissions: KycOnboardingSubmission[],
  docType: string,
): KycOnboardingSubmission | null {
  return submissions.filter((submission) => submission.docType === docType).at(-1) ?? null;
}

export default function KycContinuePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<KycOnboardingSession | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(true);
  const [submittingDocType, setSubmittingDocType] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const kycSessionToken = getKycSessionToken();
      if (!kycSessionToken) {
        void navigate('/login');
        return;
      }

      try {
        const nextSession = await kycOnboardingAPI.getSession(kycSessionToken);
        if (!cancelled) {
          setSession(nextSession);
        }
      } catch (error) {
        clearKycSessionToken();
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'تعذر تحميل جلسة التحقق');
          void navigate('/login');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleFileSelected = (docType: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
      toast.error('اختر ملف PDF أو صورة JPG/PNG/WebP');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error('حجم الملف يجب ألا يتجاوز 5 ميجابايت');
      event.target.value = '';
      return;
    }

    setSelectedFiles((current) => ({ ...current, [docType]: file }));
  };

  const refreshSession = async () => {
    const kycSessionToken = getKycSessionToken();
    if (!kycSessionToken) {
      clearKycSessionToken();
      void navigate('/login');
      return;
    }

    const nextSession = await kycOnboardingAPI.getSession(kycSessionToken);
    setSession(nextSession);
  };

  const handleSubmitDocument = async (docType: string) => {
    const file = selectedFiles[docType];
    const kycSessionToken = getKycSessionToken();
    if (!file || !kycSessionToken) {
      toast.error('اختر الملف أولاً');
      return;
    }

    setSubmittingDocType(docType);
    try {
      const docUrl = await readFileAsDataUrl(file);
      await kycOnboardingAPI.submitDocument(kycSessionToken, { docType, docUrl });
      setSelectedFiles((current) => ({ ...current, [docType]: null }));
      await refreshSession();
      toast.success('تم رفع المستند بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع المستند');
    } finally {
      setSubmittingDocType(null);
    }
  };

  if (loading) {
    return (
      <Layout title="التحقق من الهوية">
        <div className="container py-16 text-center text-muted-foreground">
          جاري تحميل حالة التحقق...
        </div>
      </Layout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Layout title="التحقق من الهوية">
      <PageTransition>
        <section className="relative overflow-hidden py-12 md:py-16">
          <GradientMesh />
          <div className="container relative max-w-4xl px-4">
            <SR>
              <Card className="rounded-2xl border-border/50 shadow-xl">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileBadge2 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>استكمال التحقق من الهوية</CardTitle>
                      <CardDescription>
                        ارفع المستندات المطلوبة لتفعيل حساب {session.user.full_name}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.required_documents.map((docType) => (
                      <Badge key={docType} variant="secondary">
                        {documentLabels[docType] ?? docType}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.required_documents.map((docType) => {
                    const latestSubmission = getLatestSubmission(session.submissions, docType);
                    const canSubmit =
                      latestSubmission?.status !== 'approved' &&
                      latestSubmission?.status !== 'pending';

                    return (
                      <div
                        key={docType}
                        className="rounded-2xl border border-border/60 bg-background/60 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <h2 className="font-semibold">{documentLabels[docType] ?? docType}</h2>
                            <p className="text-sm text-muted-foreground">
                              {latestSubmission
                                ? `الحالة الحالية: ${statusLabels[latestSubmission.status]}`
                                : 'لم يتم رفع هذا المستند بعد'}
                            </p>
                          </div>
                          {latestSubmission ? (
                            <Badge
                              variant={
                                latestSubmission.status === 'approved'
                                  ? 'default'
                                  : latestSubmission.status === 'rejected'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {statusLabels[latestSubmission.status]}
                            </Badge>
                          ) : null}
                        </div>

                        {latestSubmission?.rejectionReason ? (
                          <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                            سبب الرفض: {latestSubmission.rejectionReason}
                          </div>
                        ) : null}

                        <div className="flex flex-col gap-3 md:flex-row md:items-end">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`kyc-${docType}`}>اختر الملف</Label>
                            <Input
                              id={`kyc-${docType}`}
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/webp"
                              onChange={handleFileSelected(docType)}
                              disabled={!canSubmit}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => void handleSubmitDocument(docType)}
                            disabled={
                              !canSubmit || !selectedFiles[docType] || submittingDocType === docType
                            }
                          >
                            {submittingDocType === docType ? (
                              <>
                                <Hourglass className="ml-2 h-4 w-4" />
                                جارٍ الرفع...
                              </>
                            ) : latestSubmission?.status === 'rejected' ? (
                              <>
                                <FileUp className="ml-2 h-4 w-4" />
                                إعادة الرفع
                              </>
                            ) : latestSubmission?.status === 'approved' ? (
                              <>
                                <CheckCircle2 className="ml-2 h-4 w-4" />
                                تم الاعتماد
                              </>
                            ) : latestSubmission?.status === 'pending' ? (
                              <>
                                <Hourglass className="ml-2 h-4 w-4" />
                                بانتظار المراجعة
                              </>
                            ) : (
                              <>
                                <FileUp className="ml-2 h-4 w-4" />
                                رفع المستند
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      ماذا يحدث بعد الرفع؟
                    </div>
                    <p>
                      تظهر المستندات في لوحة الإدارة للمراجعة. سيبقى الحساب معلقًا حتى يتم اعتماد كل
                      المستندات المطلوبة.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        clearKycSessionToken();
                        void navigate('/login');
                      }}
                    >
                      العودة إلى تسجيل الدخول
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </SR>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
}
