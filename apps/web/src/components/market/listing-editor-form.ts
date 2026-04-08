import { DISTRICTS } from '@/lib/format';

export type ListingFormState = {
  id?: string;
  titleAr: string;
  description: string;
  priceEgp: string;
  district: string;
  category: string;
  address: string;
};

export const emptyListingForm: ListingFormState = {
  titleAr: '',
  description: '',
  priceEgp: '',
  district: DISTRICTS[0]?.id ?? 'kharga',
  category: 'shopping',
  address: '',
};
