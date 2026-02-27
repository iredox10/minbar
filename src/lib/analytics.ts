import { adminDatabases, DATABASE_ID, ID, Query } from './admin';

export const ANALYTICS_COLLECTION = 'analytics';

export type AnalyticsEventType = 
  | 'play_start'
  | 'play_complete'
  | 'play_pause'
  | 'download_start'
  | 'download_complete'
  | 'search'
  | 'favorite_add'
  | 'favorite_remove'
  | 'radio_start'
  | 'dua_view';

interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  itemId?: string;
  itemType?: 'episode' | 'series' | 'speaker' | 'radio' | 'dua';
  itemTitle?: string;
  duration?: number;
  userId?: string;
  sessionId?: string;
}

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_session_id', sessionId);
    }
  }
  return sessionId;
}

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const userId = localStorage.getItem('user_id') || undefined;
    
    await adminDatabases.createDocument(
      DATABASE_ID,
      ANALYTICS_COLLECTION,
      ID.unique(),
      {
        ...event,
        userId,
        sessionId: getSessionId(),
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
}

export function trackPlayStart(itemId: string, itemType: 'episode' | 'radio', itemTitle: string): void {
  trackEvent({
    eventType: 'play_start',
    itemId,
    itemType,
    itemTitle
  });
}

export function trackPlayComplete(itemId: string, itemType: 'episode' | 'radio', itemTitle: string, duration: number): void {
  trackEvent({
    eventType: 'play_complete',
    itemId,
    itemType,
    itemTitle,
    duration
  });
}

export function trackDownload(itemId: string, itemTitle: string): void {
  trackEvent({
    eventType: 'download_complete',
    itemId,
    itemType: 'episode',
    itemTitle
  });
}

export function trackSearch(query: string): void {
  trackEvent({
    eventType: 'search',
    itemTitle: query
  });
}

export function trackFavoriteAdd(itemId: string, itemType: 'episode' | 'series' | 'dua', itemTitle: string): void {
  trackEvent({
    eventType: 'favorite_add',
    itemId,
    itemType,
    itemTitle
  });
}

export function trackRadioStart(stationId: string, stationName: string): void {
  trackEvent({
    eventType: 'radio_start',
    itemId: stationId,
    itemType: 'radio',
    itemTitle: stationName
  });
}

export function trackDuaView(duaId: string, duaTitle: string): void {
  trackEvent({
    eventType: 'dua_view',
    itemId: duaId,
    itemType: 'dua',
    itemTitle: duaTitle
  });
}

export async function getAnalyticsStats(days: number = 30): Promise<{
  totalPlays: number;
  totalDownloads: number;
  totalSearches: number;
  totalFavorites: number;
  playsByDay: { date: string; count: number }[];
  topEpisodes: { itemId: string; itemTitle: string; count: number }[];
  topSearches: { query: string; count: number }[];
  eventTypeCounts: { type: string; count: number }[];
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const response = await adminDatabases.listDocuments(
      DATABASE_ID,
      ANALYTICS_COLLECTION,
      [Query.greaterThanEqual('timestamp', startDate.toISOString())]
    );

    const documents = response.documents;
    
    const totalPlays = documents.filter(d => d.eventType === 'play_start').length;
    const totalDownloads = documents.filter(d => d.eventType === 'download_complete').length;
    const totalSearches = documents.filter(d => d.eventType === 'search').length;
    const totalFavorites = documents.filter(d => d.eventType === 'favorite_add').length;

    const playsByDayMap = new Map<string, number>();
    documents
      .filter(d => d.eventType === 'play_start' && d.timestamp)
      .forEach(d => {
        const date = new Date(d.timestamp).toISOString().split('T')[0];
        playsByDayMap.set(date, (playsByDayMap.get(date) || 0) + 1);
      });
    
    const playsByDay = Array.from(playsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    const episodeCounts = new Map<string, { title: string; count: number }>();
    documents
      .filter(d => d.eventType === 'play_start' && d.itemId)
      .forEach(d => {
        const existing = episodeCounts.get(d.itemId);
        if (existing) {
          existing.count++;
        } else {
          episodeCounts.set(d.itemId, { title: d.itemTitle || 'Unknown', count: 1 });
        }
      });
    
    const topEpisodes = Array.from(episodeCounts.entries())
      .map(([itemId, data]) => ({ itemId, itemTitle: data.title, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const searchCounts = new Map<string, number>();
    documents
      .filter(d => d.eventType === 'search' && d.itemTitle)
      .forEach(d => {
        searchCounts.set(d.itemTitle, (searchCounts.get(d.itemTitle) || 0) + 1);
      });
    
    const topSearches = Array.from(searchCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const eventTypeCountsMap = new Map<string, number>();
    documents.forEach(d => {
      eventTypeCountsMap.set(d.eventType, (eventTypeCountsMap.get(d.eventType) || 0) + 1);
    });
    
    const eventTypeCounts = Array.from(eventTypeCountsMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPlays,
      totalDownloads,
      totalSearches,
      totalFavorites,
      playsByDay,
      topEpisodes,
      topSearches,
      eventTypeCounts
    };
  } catch (error) {
    console.error('Failed to get analytics stats:', error);
    return {
      totalPlays: 0,
      totalDownloads: 0,
      totalSearches: 0,
      totalFavorites: 0,
      playsByDay: [],
      topEpisodes: [],
      topSearches: [],
      eventTypeCounts: []
    };
  }
}