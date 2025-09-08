// Calendarific API使用時の実装例
export class CalendarificService {
  private apiKey: string;
  private baseUrl = 'https://calendarific.com/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getHolidaysAndEvents(country: string, year: number) {
    try {
      const response = await fetch(
        `${this.baseUrl}/holidays?api_key=${this.apiKey}&country=${country}&year=${year}&type=holiday,observance,religious,cultural`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 祝日と行事を含むデータを返す
      return data.response.holidays.map((holiday: any) => ({
        name: holiday.name,
        localName: holiday.name,
        date: holiday.date.iso,
        type: holiday.type[0],
        color: this.getColorForType(holiday.type[0]),
        description: holiday.description
      }));
    } catch (error) {
      console.error('Calendarific API error:', error);
      return [];
    }
  }

  private getColorForType(type: string): string {
    switch (type) {
      case 'National holiday': return '#ff6b6b';
      case 'Religious': return '#4ecdc4';
      case 'Cultural': return '#ff6b9d';
      case 'Observance': return '#ff8c42';
      default: return '#6b7280';
    }
  }
}

// 使用例
const calendarificService = new CalendarificService('your_api_key');
const events = await calendarificService.getHolidaysAndEvents('US', 2025);

// 取得できるデータ例
const sampleData = [
  {
    name: 'Christmas Day',
    localName: 'Christmas Day',
    date: '2025-12-25',
    type: 'National holiday',
    color: '#ff6b6b',
    description: 'Christmas Day is a public holiday...'
  },
  {
    name: 'Halloween',
    localName: 'Halloween',
    date: '2025-10-31',
    type: 'Cultural',
    color: '#ff6b9d',
    description: 'Halloween is a cultural celebration...'
  },
  {
    name: 'Valentine\'s Day',
    localName: 'Valentine\'s Day',
    date: '2025-02-14',
    type: 'Cultural',
    color: '#ff6b9d',
    description: 'Valentine\'s Day is a cultural celebration...'
  }
];
