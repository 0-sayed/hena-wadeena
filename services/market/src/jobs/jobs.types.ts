export const JOB_CATEGORIES = [
  'agriculture',
  'tourism',
  'skilled_trade',
  'domestic',
  'logistics',
  'handicraft',
] as const;

export const JOB_STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'expired'] as const;

export const JOB_APPLICATION_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
  'in_progress',
  'completed',
] as const;

export const COMPENSATION_TYPES = ['fixed', 'daily', 'per_kg', 'negotiable'] as const;

export const REVIEW_DIRECTIONS = ['worker_rates_poster', 'poster_rates_worker'] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];
export type CompensationType = (typeof COMPENSATION_TYPES)[number];
export type ReviewDirection = (typeof REVIEW_DIRECTIONS)[number];

export interface JobPostRecord {
  id: string;
  posterId: string;
  title: string;
  descriptionAr: string;
  descriptionEn: string | null;
  category: JobCategory;
  area: string;
  compensation: number;
  compensationType: CompensationType;
  slots: number;
  status: JobStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface JobApplicationRecord {
  id: string;
  jobId: string;
  applicantId: string;
  noteAr: string | null;
  status: JobApplicationStatus;
  appliedAt: string;
  resolvedAt: string | null;
}

export interface JobReviewRecord {
  id: string;
  jobId: string;
  applicationId: string;
  reviewerId: string;
  revieweeId: string;
  direction: ReviewDirection;
  rating: number;
  comment: string | null;
  createdAt: string;
}
