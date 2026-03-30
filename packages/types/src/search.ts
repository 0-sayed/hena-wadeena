export type SearchResultType =
  | 'listing'
  | 'opportunity'
  | 'business'
  | 'user'
  | 'guide'
  | 'attraction'
  | 'package'
  | 'poi';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: { ar: string; en: string | null };
  snippet: string;
  rank: number;
  metadata: Record<string, string | undefined>;
}

export interface ServiceSearchResponse {
  data: SearchResult[];
  hasMore: boolean;
  query: string;
}

export interface UnifiedSearchResponse {
  data: SearchResult[];
  hasMore: boolean;
  query: string;
  sources: string[];
}
