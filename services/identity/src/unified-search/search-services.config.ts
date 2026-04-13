import { resolveLocalServiceUrl, type SearchResultType } from '@hena-wadeena/types';

export interface SearchServiceConfig {
  name: string;
  url: string;
  types: SearchResultType[];
}

export const EXTERNAL_SEARCH_SERVICES: SearchServiceConfig[] = [
  {
    name: 'market',
    url: resolveLocalServiceUrl({
      defaultPort: 8002,
      explicitPort: process.env.MARKET_PORT,
      explicitUrl: process.env.MARKET_SERVICE_URL,
      env: process.env,
    }),
    types: ['listing', 'opportunity', 'business'],
  },
  {
    name: 'guide-booking',
    url: resolveLocalServiceUrl({
      defaultPort: 8003,
      explicitPort: process.env.GUIDE_BOOKING_PORT,
      explicitUrl: process.env.GUIDE_BOOKING_SERVICE_URL,
      env: process.env,
    }),
    types: ['guide', 'attraction', 'package'],
  },
  {
    name: 'map',
    url: resolveLocalServiceUrl({
      defaultPort: 8004,
      explicitPort: process.env.MAP_PORT,
      explicitUrl: process.env.MAP_SERVICE_URL,
      env: process.env,
    }),
    types: ['poi'],
  },
];
