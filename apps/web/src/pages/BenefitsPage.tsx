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
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useBenefits } from '@/hooks/use-benefits';
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
  const { t } = useTranslation('benefits');

  const [answers, setAnswers] = useState<WizardAnswers>(DEFAULT_ANSWERS);
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const { data: allBenefits, isLoading, isError, refetch } = useBenefits();
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

  function handleRetry() {
    void refetch();
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <SR direction="up">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              {t('title')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </SR>

        {!showResults ? (
          <WizardStep
            step={currentStep}
            stepIndex={clampedStep}
            totalSteps={steps.length}
            answers={answers}
            onAnswer={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
            onNext={handleNext}
            onBack={clampedStep > 0 ? handleBack : undefined}
          />
        ) : (
          <ResultsView
            matched={matchedBenefits}
            isLoading={isLoading}
            isError={isError}
            onRestart={handleRestart}
            onRetry={handleRetry}
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
  onAnswer: (key: keyof WizardAnswers, value: WizardAnswers[keyof WizardAnswers]) => void;
  onNext: () => void;
  onBack?: () => void;
};

function WizardStep({
  step,
  stepIndex,
  totalSteps,
  answers,
  onAnswer,
  onNext,
  onBack,
}: WizardStepProps) {
  const { t } = useTranslation('benefits');
  return (
    <SR direction="up">
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t('wizard.questionXofY', { current: stepIndex + 1, total: totalSteps })}
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
          <StepBody step={step} answers={answers} onAnswer={onAnswer} />
          <div className="flex justify-between pt-2">
            {onBack ? (
              <Button variant="outline" onClick={onBack}>
                <ChevronRight className="me-1 h-4 w-4" />
                {t('wizard.prev')}
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={onNext}>
              {stepIndex < totalSteps - 1
                ? t('wizard.next')
                : t('wizard.showResults')}
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
  onAnswer: (key: keyof WizardAnswers, value: WizardAnswers[keyof WizardAnswers]) => void;
};

function StepBody({ step, answers, onAnswer }: StepBodyProps) {
  const { t } = useTranslation('benefits');
  if (step.id === 'householdSize') {
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">
          {t('steps.householdSize.question')}
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
    const options: { value: IncomeBracket; key: string }[] = [
      { value: 'low', key: 'steps.incomeBracket.low' },
      { value: 'mid', key: 'steps.incomeBracket.mid' },
      { value: 'high', key: 'steps.incomeBracket.high' },
    ];
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">
          {t('steps.incomeBracket.question')}
        </p>
        <div className="grid gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onAnswer('incomeBracket', opt.value)}
              className={`rounded-lg border p-3 text-start transition-colors ${answers.incomeBracket === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              {t(opt.key)}
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
          {t('steps.headAge.question')}
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
              {t('steps.headAge.suffix')}
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
        question={t('steps.hasDisability.question')}
        value={answers.hasDisability}
        onChange={(v) => onAnswer('hasDisability', v)}
      />
    );
  }

  if (step.id === 'employment') {
    const options: { value: Employment; key: string }[] = [
      { value: 'employed', key: 'steps.employment.employed' },
      { value: 'self_employed', key: 'steps.employment.self_employed' },
      { value: 'unemployed', key: 'steps.employment.unemployed' },
      { value: 'farmer', key: 'steps.employment.farmer' },
    ];
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">
          {t('steps.employment.question')}
        </p>
        <div className="grid gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onAnswer('employment', opt.value)}
              className={`rounded-lg border p-3 text-start transition-colors ${answers.employment === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              {t(opt.key)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step.id === 'ownsLand') {
    return (
      <YesNoStep
        question={t('steps.ownsLand.question')}
        value={answers.ownsLand}
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
  onChange,
}: {
  question: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation('benefits');
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
              ? t('common.yes')
              : t('common.no')}
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
  onRestart,
  onRetry,
}: {
  matched: BenefitInfo[];
  isLoading: boolean;
  isError: boolean;
  onRestart: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation('benefits');
  const { language } = useAuth();
  const lang = language === 'en' ? 'en' : 'ar';
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
            {t('results.loadingError')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('results.loadingErrorSub')}
          </p>
        </div>
        <div className="text-center">
          <Button variant="outline" onClick={onRetry}>
            {t('results.tryAgain')}
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
          {matched.length > 0 ? (
            t('results.matchCount', { count: matched.length })
          ) : (
            t('results.matchCount_zero')
          )}
        </h2>
        {matched.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('results.contactOffice')}
          </p>
        )}
      </div>

      {matched.map((benefit) => (
        <BenefitCard key={benefit.slug} benefit={benefit} lang={lang} />
      ))}

      <div className="text-center">
        <Button variant="outline" onClick={onRestart}>
          {t('wizard.restart')}
        </Button>
      </div>
    </SR>
  );
}

// ── BenefitCard ──────────────────────────────────────────────────────────────

function BenefitCard({ benefit, lang }: { benefit: BenefitInfo; lang: 'ar' | 'en' }) {
  const { t } = useTranslation('benefits');
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
            {t('card.requiredDocs')}
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
