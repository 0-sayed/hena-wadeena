import { GUIDE_PROFILE } from '../../../../../scripts/seed/shared-ids.js';

const AV01 = 'c3000000-0000-4000-8000-000000000001';
const AV02 = 'c3000000-0000-4000-8000-000000000002';
const AV03 = 'c3000000-0000-4000-8000-000000000003';
const AV04 = 'c3000000-0000-4000-8000-000000000004';
const AV05 = 'c3000000-0000-4000-8000-000000000005';
const AV06 = 'c3000000-0000-4000-8000-000000000006';
const AV07 = 'c3000000-0000-4000-8000-000000000007';
const AV08 = 'c3000000-0000-4000-8000-000000000008';

/** Showcase: blocked dates for guides showing they have active schedules */
export const showcaseGuideAvailability = [
  // GP01 (Youssef) — booked weekends in April 2026
  {
    id: AV01,
    guideId: GUIDE_PROFILE.GP01,
    date: '2026-04-12',
    isBlocked: true,
    note: 'جولة محجوزة مسبقاً — مجموعة فرنسية',
  },
  {
    id: AV02,
    guideId: GUIDE_PROFILE.GP01,
    date: '2026-04-13',
    isBlocked: true,
    note: 'جولة محجوزة مسبقاً — مجموعة فرنسية',
  },
  {
    id: AV03,
    guideId: GUIDE_PROFILE.GP01,
    date: '2026-04-19',
    isBlocked: true,
    note: 'جولة أثرية — جامعة القاهرة',
  },
  // GP02 (Fatma) — desert safari block
  {
    id: AV04,
    guideId: GUIDE_PROFILE.GP02,
    date: '2026-04-10',
    isBlocked: true,
    note: 'سفاري 3 أيام في الصحراء البيضاء',
  },
  {
    id: AV05,
    guideId: GUIDE_PROFILE.GP02,
    date: '2026-04-11',
    isBlocked: true,
    note: 'سفاري 3 أيام في الصحراء البيضاء',
  },
  {
    id: AV06,
    guideId: GUIDE_PROFILE.GP02,
    date: '2026-04-12',
    isBlocked: true,
    note: 'سفاري 3 أيام في الصحراء البيضاء',
  },
  // GP03 (Ahmed) — adventure tour
  {
    id: AV07,
    guideId: GUIDE_PROFILE.GP03,
    date: '2026-04-18',
    isBlocked: true,
    note: 'رحلة تسلق جبال وإقامة في البرية',
  },
  // GP05 (Omar) — photography tour
  {
    id: AV08,
    guideId: GUIDE_PROFILE.GP05,
    date: '2026-04-26',
    isBlocked: true,
    note: 'جولة تصوير شروق شمس الصحراء البيضاء',
  },
];
