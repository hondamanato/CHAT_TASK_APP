import { SearchedCity } from '../types/weather';

// Nominatim APIレスポンス型
interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

// レート制限用（1秒1リクエスト）
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();
};

// 都市名を抽出
const extractCityName = (result: NominatimResult): string => {
  if (result.address) {
    return (
      result.address.city ||
      result.address.town ||
      result.address.village ||
      result.address.municipality ||
      result.name
    );
  }
  return result.name;
};

export const geocodingService = {
  // 都市を検索
  async searchCities(query: string): Promise<SearchedCity[]> {
    if (!query.trim()) {
      return [];
    }

    await waitForRateLimit();

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '10',
        'accept-language': 'ja',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            'User-Agent': 'TaplessCalendarApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results: NominatimResult[] = await response.json();

      return results.map(result => ({
        name: extractCityName(result),
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        long: parseFloat(result.lon),
      }));
    } catch (error) {
      console.error('[Geocoding] Search error:', error);
      return [];
    }
  },
};
