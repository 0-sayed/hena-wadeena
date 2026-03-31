import type { SearchResultType } from '@hena-wadeena/types';

export interface SearchServiceConfig {
  name: string;
  url: string;
  types: SearchResultType[];
}

export const EXTERNAL_SEARCH_SERVICES: SearchServiceConfig[] = [
  {
    name: 'market',
    url: process.env.MARKET_SERVICE_URL ?? 'http://localhost:8002',
    types: ['listing', 'opportunity', 'business'],
  },
  {
    name: 'guide-booking',
    url: process.env.GUIDE_BOOKING_SERVICE_URL ?? 'http://localhost:8003',
    types: ['guide', 'attraction', 'package'],
  },
  {
    name: 'map',
    url: process.env.MAP_SERVICE_URL ?? 'http://localhost:8004',
    types: ['poi'],
  },
];
