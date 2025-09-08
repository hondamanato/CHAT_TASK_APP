import Constants from 'expo-constants';

interface PlaceResult {
  place_id: string;
  formatted_address: string;
  name: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface AutocompleteResponse {
  predictions: AutocompletePrediction[];
  status: string;
  error_message?: string;
}

interface PlaceDetailsResponse {
  result: PlaceResult;
  status: string;
  error_message?: string;
}

class PlacesService {
  private apiKey: string;
  private cache: Map<string, any>;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || 
                  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    this.cache = new Map();
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Please set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
    }
  }

  async searchPlaces(query: string, options?: {
    location?: { lat: number; lng: number };
    radius?: number;
    language?: string;
  }): Promise<AutocompletePrediction[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    if (!query.trim()) {
      return [];
    }

    const cacheKey = `autocomplete_${query}_${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        input: query.trim(),
        key: this.apiKey,
        language: options?.language || 'ja',
      });

      // 日本を基準にしつつグローバル検索を許可
      if (options?.location) {
        params.append('location', `${options.location.lat},${options.location.lng}`);
        params.append('radius', (options.radius || 50000).toString());
      } else {
        // デフォルトで東京を中心とした検索（グローバル結果も含む）
        params.append('location', '35.6762,139.6503'); // 東京の座標
        params.append('radius', '100000'); // 100km範囲（優先度用）
      }

      const url = `${this.baseUrl}/autocomplete/json?${params.toString()}`;
      
      const response = await fetch(url);
      const data: AutocompleteResponse = await response.json();

      if (data.status !== 'OK') {
        console.error('Places API error:', data.status, data.error_message);
        if (data.status === 'REQUEST_DENIED') {
          throw new Error(`APIキーが無効または制限されています: ${data.error_message}`);
        }
        if (data.status === 'OVER_QUERY_LIMIT') {
          throw new Error('API使用量の上限に達しました');
        }
        throw new Error(`Places API error: ${data.status}`);
      }

      const predictions = data.predictions || [];
      
      // キャッシュに保存（5分間）
      this.cache.set(cacheKey, predictions);
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, 5 * 60 * 1000);

      return predictions;
    } catch (error) {
      console.error('Places API search error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('場所の検索中にエラーが発生しました');
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    const cacheKey = `details_${placeId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: this.apiKey,
        fields: 'place_id,formatted_address,name,types,geometry',
        language: 'ja',
      });

      const url = `${this.baseUrl}/details/json?${params.toString()}`;
      const response = await fetch(url);
      const data: PlaceDetailsResponse = await response.json();

      if (data.status !== 'OK') {
        console.error('Place details error:', data.status, data.error_message);
        throw new Error(`場所の詳細取得に失敗: ${data.status}`);
      }

      const result = data.result;
      
      // キャッシュに保存（10分間）
      this.cache.set(cacheKey, result);
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, 10 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Place details error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('場所の詳細取得中にエラーが発生しました');
    }
  }

  async getNearbyPlaces(location: { lat: number; lng: number }, options?: {
    radius?: number;
    type?: string;
    keyword?: string;
  }): Promise<PlaceResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    try {
      const params = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: (options?.radius || 1000).toString(),
        key: this.apiKey,
        language: 'ja',
      });

      if (options?.type) {
        params.append('type', options.type);
      }
      if (options?.keyword) {
        params.append('keyword', options.keyword);
      }

      const url = `${this.baseUrl}/nearbysearch/json?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Nearby places error:', data.status, data.error_message);
        throw new Error(`周辺検索に失敗: ${data.status}`);
      }

      return data.results || [];
    } catch (error) {
      console.error('Nearby places error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('周辺の場所取得中にエラーが発生しました');
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  // APIキーの有効性をテストする
  async testApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const params = new URLSearchParams({
        input: 'test',
        key: this.apiKey,
        language: 'ja',
      });

      const url = `${this.baseUrl}/autocomplete/json?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      return data.status !== 'REQUEST_DENIED';
    } catch {
      return false;
    }
  }
}

export const placesService = new PlacesService();
export type { PlaceResult, AutocompletePrediction };