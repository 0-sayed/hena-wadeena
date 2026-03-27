export interface SearchResult {
  id: string;
  type: 'listing' | 'opportunity' | 'business';
  title: { ar: string; en: string | null };
  snippet: string;
  rank: number;
  metadata: {
    category?: string;
    district?: string;
    sector?: string;
    status?: string;
  };
}

export interface SearchResponse {
  data: SearchResult[];
  hasMore: boolean;
  query: string;
}
