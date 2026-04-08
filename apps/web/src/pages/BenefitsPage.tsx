import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Phone,
  MapPin,
  Info,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { SR } from '@/components/motion/ScrollReveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useBenefits } from '@/hooks/use-benefits';
import { pickLocalizedCopy } from '@/lib/localization';
import type { BenefitInfo } from '@/services/api';
import { getMatchedSlugs } from '@/lib/benefits-eligibility';
import type { WizardAnswers, IncomeBracket, Employment } from '@/lib/benefits-eligibility';

// ── Wizard step definitions ──────────────────────────────────────────────────

type Step =
  | { id: 'householdSize' }
  | { id: 'incomeBracket' }
  | { id: 'headAge' }
  | { id: 'hasDisability' }
  | { id: 'employment' }
  | { id: 'ownsLand' };

function getSteps(answers: Partial<WizardAnswers>): Step[] {
  const steps: Step[] = [
    { id: 'householdSize' },
    { id: 'incomeBracket' },
    { id: 'headAge' },
    { id: 'hasDisability' },
    { id: 'employment' },
  ];
  // Show ownsLand only for farmers
  if (answers.employment === 'farmer') {
    steps.push({ id: 'ownsLand' });
  }
  return steps;
}

const DEFAULT_ANSWERS: WizardAnswers = {
  householdSize: 1,
  incomeBracket: 'mid',
  headAge: 40,
  hasDisability: false,
  employment: 'employed',
  ownsLand: false,
};

// ── Main component ───────────────────────────────────────────────────────────

export default function BenefitsPage() {
  const { language } = useAuth();
  const lang = language === 'en' ? 'en' : 'ar';

  const [answers, setAnswers] = useState<WizardAnswers>(DEFAULT_ANSWERS);
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const { data: allBenefits, isLoading, isError } = useBenefits();
  const steps = getSteps(answers);
  const clampedStep = Math.min(step, steps.length - 1);
  const currentStep = steps[clampedStep];

  const matchedSlugs = showResults ? getMatchedSlugs(answers) : [];
  const matchedBenefits: BenefitInfo[] = showResults
    ? (allBenefits ?? []).filter((b) => matchedSlugs.includes(b.slug))
    : [];

  function handleNext() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      setShowResults(true);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }

  function handleRestart() {
    setAnswers(DEFAULT_ANSWERS);
    setStep(0);
    setShowResults(false);
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <SR direction="up">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              {pickLocalizedCopy(lang, {
                ar: 'مساعد المزايا الحكومية',
                en: 'Government Benefits Navigator',
              })}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {pickLocalizedCopy(lang, {
                ar: 'أجب على أسئلة بسيطة لاكتشاف البرامج الحكومية التي تؤهّلك',
                en: 'Answer a few questions to discover the government programs you qualify for',
              })}
            </p>
          </div>
        </SR>

        {!showResults ? (
          <WizardStep
            step={currentStep}
            stepIndex={clampedStep}
            totalSteps={steps.length}
            answers={answers}
            lang={lang}
            onAnswer={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
            onNext={handleNext}
            onBack={clampedStep > 0 ? handleBack : undefined}
          />
        ) : (
          <ResultsView
            matched={matchedBenefits}
            isLoading={isLoading}
            isError={isError}
            lang={lang}
            onRestart={handleRestart}
          />
        )}
      </div>
    </Layout>
  );
}

// ── WizardStep ───────────────────────────────────────────────────────────────

type WizardStepProps = {
  step: Step;
  stepIndex: number;
  totalSteps: number;
  answers: WizardAnswers;
  lang: 'ar' | 'en';
  onAnswer: (key: keyof WizardAnswers, value: WizardAnswers[keyof WizardAnswers]) => void;
  onNext: () => void;
  onBack?: () => void;
};

function WizardStep({
  step,
  stepIndex,
  totalSteps,
  answers,
  lang,
  onAnswer,
  onNext,
  onBack,
}: WizardStepProps) {
  return (
    <SR direction="up">
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {pickLocalizedCopy(lang, {
                ar: `سؤال ${stepIndex + 1} من ${totalSteps}`,
                en: `Question ${stepIndex + 1} of ${totalSteps}`,
              })}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <StepBody step={step} answers={answers} lang={lang} onAnswer={onAnswer} />
          <div className="flex justify-between pt-2">
            {onBack ? (
              <Button variant="outline" onClick={onBack}>
                <ChevronRight className="me-1 h-4 w-4" />
                {pickLocalizedCopy(lang, { ar: 'السابق', en: 'Back' })}
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={onNext}>
              {stepIndex < totalSteps - 1
                ? pickLocalizedCopy(lang, { ar: 'التالي', en: 'Next' })
                : pickLocalizedCopy(lang, { ar: 'عرض النتائج', en: 'Show results' })}
              <ChevronLeft className="ms-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </SR>
  );
}

// ── StepBody — renders the input for each step ───────────────────────────────

type StepBodyProps = {
  step: Step;
  answers: WizardAnswers;
  lang: 'ar' | 'en';
  onAnswer: (key: keyof WizardAnswers, value: WizardAnswers[keyof WizardAnswers]) => void;
};

function StepBody({ step, answers, lang, onAnswer }: StepBodyProps) {
  if (step.id === 'householdSize') {
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">
          {pickLocalizedCopy(lang, {
            ar: 'كم عدد أفراد أسرتك؟',
            en: 'How many people are in your household?',
          })}
        </p>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onAnswer('householdSize', Math.max(1, answers.householdSize - 1))}
          >
            −
          </Button>
          <span className="w-12 text-center text-2xl font-bold">{answers.householdSize}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onAnswer('householdSize', answers.householdSize + 1)}
          >
            +
          </Button>
        </div>
      </div>
    );
  }

  if (step.id === 'incomeBracket') {
    const options: { value: IncomeBracket; ar: string; en: string }[] = [
      { value: 'low', ar: 'أقل من 1,500 ج.م شهريًا', en: 'Less than 1,500 EGP/month' },
      { value: 'mid', ar: '1,500 – 3,000 ج.م شهريًا', en: '1,500 – 3,000 EGP/month' },
      { value: 'high', ar: 'أكثر من 3,000 ج.م شهريًا', en: 'More than 3,000 EGP/month' },
    ];
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">
          {pickLocalizedCopy(lang, {
            ar: 'ما هو الدخل الشهري الإجمالي للأسرة؟',
            en: "What is your household's total monthly income?",
          })}
        </p>
        <div className="grid gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onAnswer('incomeBracket', opt.value)}
              className={`rounded-lg border p-3 text-start transition-colors ${answers.incomeBracket === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              {pickLocalizedCopy(lang, { ar: opt.ar, en: opt.en })}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step.id === 'headAge') {
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">
          {pickLocalizedCopy(lang, {
            ar: 'كم عمر رب الأسرة؟',
            en: 'How old is the head of household?',
          })}
        </p>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onAnswer('headAge', Math.max(18, answers.headAge - 1))}
          >
            −
          </Button>
          <span className="w-16 text-center text-2xl font-bold">
            {answers.headAge}
            <span className="ms-1 text-sm font-normal text-muted-foreground">
              {pickLocalizedCopy(lang, { ar: 'سنة', en: 'yrs' })}
            </span>
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onAnswer('headAge', answers.headAge + 1)}
          >
            +
          </Button>
        </div>
      </div>
    );
  }

  if (step.id === 'hasDisability') {
    return (
      <YesNoStep
        question={pickLocalizedCopy(lang, {
          ar: 'هل يوجد فرد معاق في الأسرة؟',
          en: 'Does any household member have a disability?',
        })}
        value={answers.hasDisability}
        lang={lang}
        onChange={(v) => onAnswer('hasDisability', v)}
      />
    );
  }

  if (step.id === 'employment') {
    const options: { value: Employment; ar: string; en: string }[] = [
      { value: 'employed', ar: 'موظف (حكومي أو خاص)', en: 'Employed (public or private)' },
      { value: 'self_employed', ar: 'عمل حر أو تجاري', en: 'Self-employed or business owner' },
      { value: 'unemployed', ar: 'عاطل عن العمل', en: 'Unemployed' },
      { value: 'farmer', ar: 'مزارع', en: 'Farmer' },
    ];
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">
          {pickLocalizedCopy(lang, {
            ar: 'ما هو الوضع الوظيفي لرب الأسرة؟',
            en: "What is the head of household's employment status?",
          })}
        </p>
        <div className="grid gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onAnswer('employment', opt.value)}
              className={`rounded-lg border p-3 text-start transition-colors ${answers.employment === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              {pickLocalizedCopy(lang, { ar: opt.ar, en: opt.en })}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step.id === 'ownsLand') {
    return (
      <YesNoStep
        question={pickLocalizedCopy(lang, {
          ar: 'هل تمتلك أرضًا زراعية؟',
          en: 'Do you own agricultural land?',
        })}
        value={answers.ownsLand}
        lang={lang}
        onChange={(v) => onAnswer('ownsLand', v)}
      />
    );
  }

  return null;
}

// ── YesNoStep ────────────────────────────────────────────────────────────────

function YesNoStep({
  question,
  value,
  lang,
  onChange,
}: {
  question: string;
  value: boolean;
  lang: 'ar' | 'en';
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-lg font-medium">{question}</p>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            onClick={() => onChange(v)}
            className={`rounded-lg border p-4 text-center transition-colors ${value === v ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:border-primary/50'}`}
          >
            {v
              ? pickLocalizedCopy(lang, { ar: 'نعم', en: 'Yes' })
              : pickLocalizedCopy(lang, { ar: 'لا', en: 'No' })}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── ResultsView ──────────────────────────────────────────────────────────────

function ResultsView({
  matched,
  isLoading,
  isError,
  lang,
  onRestart,
}: {
  matched: BenefitInfo[];
  isLoading: boolean;
  isError: boolean;
  lang: 'ar' | 'en';
  onRestart: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <SR direction="up" className="space-y-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">
            {pickLocalizedCopy(lang, {
              ar: 'تعذّر تحميل البيانات',
              en: 'Could not load benefit data',
            })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {pickLocalizedCopy(lang, {
              ar: 'حدث خطأ أثناء جلب البيانات. يرجى المحاولة مجدداً.',
              en: 'Something went wrong while fetching benefits. Please try again.',
            })}
          </p>
        </div>
        <div className="text-center">
          <Button variant="outline" onClick={onRestart}>
            {pickLocalizedCopy(lang, { ar: 'إعادة المحاولة', en: 'Try again' })}
          </Button>
        </div>
      </SR>
    );
  }

  return (
    <SR direction="up" className="space-y-6">
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
        <h2 className="text-xl font-bold">
          {matched.length > 0
            ? pickLocalizedCopy(lang, {
                ar: `وجدنا ${matched.length} برنامج تؤهّلك للتقديم`,
                en: `You qualify for ${matched.length} program${matched.length !== 1 ? 's' : ''}`,
              })
            : pickLocalizedCopy(lang, {
                ar: 'لم نجد برامج تطابق بياناتك الآن',
                en: 'No matching programs found at this time',
              })}
        </h2>
        {matched.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {pickLocalizedCopy(lang, {
              ar: 'يمكنك التواصل مع مكتب التضامن الاجتماعي بالخارجة للمزيد من المعلومات',
              en: 'You can contact the Social Affairs office in Kharga for more information',
            })}
          </p>
        )}
      </div>

      {matched.map((benefit) => (
        <BenefitCard key={benefit.slug} benefit={benefit} lang={lang} />
      ))}

      <div className="text-center">
        <Button variant="outline" onClick={onRestart}>
          {pickLocalizedCopy(lang, { ar: 'إعادة الاختبار', en: 'Start over' })}
        </Button>
      </div>
    </SR>
  );
}

// ── BenefitCard ──────────────────────────────────────────────────────────────

function BenefitCard({ benefit, lang }: { benefit: BenefitInfo; lang: 'ar' | 'en' }) {
  const name = lang === 'ar' ? benefit.nameAr : benefit.nameEn;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {benefit.ministryAr}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Documents checklist */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" />
            {pickLocalizedCopy(lang, { ar: 'المستندات المطلوبة', en: 'Required documents' })}
          </p>
          <ul className="space-y-1">
            {benefit.documentsAr.map((doc, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                {doc}
              </li>
            ))}
          </ul>
        </div>

        {/* Office contact */}
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
          <p className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {benefit.officeNameAr}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a
              href={`tel:${benefit.officePhone}`}
              className="text-primary underline-offset-2 hover:underline"
              dir="ltr"
            >
              {benefit.officePhone}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {benefit.officeAddressAr}
          </p>
        </div>

        {/* Enrollment notes */}
        <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-blue-800 dark:text-blue-200">{benefit.enrollmentNotesAr}</p>
        </div>
      </CardContent>
    </Card>
  );
}
