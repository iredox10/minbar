import { adminDatabases, DATABASE_ID, ID, Query } from './admin';
import { Permission, Role } from 'appwrite';

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

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  itemId?: string;
  itemType?: 'episode' | 'series' | 'speaker' | 'radio' | 'dua';
  itemTitle?: string;
  duration?: number;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
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
      },
      [
        Permission.read(Role.any()),
        Permission.write(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]
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

export interface UserAnalytics {
  id: string; // userId or sessionId
  isRegistered: boolean;
  totalPlays: number;
  totalDownloads: number;
  totalSearches: number;
  totalFavorites: number;
  lastActive: string;
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
  recentActivities: AnalyticsEvent[];
  userStats: UserAnalytics[];
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const response = await adminDatabases.listDocuments(
      DATABASE_ID,
      ANALYTICS_COLLECTION,
      [
        Query.greaterThanEqual('timestamp', startDate.toISOString()),
        Query.limit(5000),
        Query.orderDesc('timestamp')
      ]
    );

    const documents = response.documents;
    
    const totalPlays = new Set(documents.filter(d => d.eventType === 'play_start').map(d => d.userId || d.sessionId)).size;
    const totalDownloads = new Set(documents.filter(d => d.eventType === 'download_complete').map(d => d.userId || d.sessionId)).size;
    const totalSearches = new Set(documents.filter(d => d.eventType === 'search').map(d => d.userId || d.sessionId)).size;
    const totalFavorites = new Set(documents.filter(d => d.eventType === 'favorite_add').map(d => d.userId || d.sessionId)).size;

    const playsByDayMap = new Map<string, Set<string>>();
    documents
      .filter(d => d.eventType === 'play_start' && d.timestamp)
      .forEach(d => {
        const date = new Date(d.timestamp).toISOString().split('T')[0];
        if (!playsByDayMap.has(date)) playsByDayMap.set(date, new Set());
        playsByDayMap.get(date)!.add(d.userId || d.sessionId || 'unknown');
      });
    
    const playsByDay = Array.from(playsByDayMap.entries())
      .map(([date, usersSet]) => ({ date, count: usersSet.size }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    const episodeUsersMap = new Map<string, { title: string; users: Set<string> }>();
    documents
      .filter(d => d.eventType === 'play_start' && d.itemId)
      .forEach(d => {
        const existing = episodeUsersMap.get(d.itemId);
        if (existing) {
          existing.users.add(d.userId || d.sessionId || 'unknown');
        } else {
          episodeUsersMap.set(d.itemId, { 
            title: d.itemTitle || 'Unknown', 
            users: new Set([d.userId || d.sessionId || 'unknown']) 
          });
        }
      });
    
    const topEpisodes = Array.from(episodeUsersMap.entries())
      .map(([itemId, data]) => ({ itemId, itemTitle: data.title, count: data.users.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const searchUsersMap = new Map<string, Set<string>>();
    documents
      .filter(d => d.eventType === 'search' && d.itemTitle)
      .forEach(d => {
        const query = d.itemTitle!;
        if (!searchUsersMap.has(query)) searchUsersMap.set(query, new Set());
        searchUsersMap.get(query)!.add(d.userId || d.sessionId || 'unknown');
      });
    
    const topSearches = Array.from(searchUsersMap.entries())
      .map(([query, usersSet]) => ({ query, count: usersSet.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const eventTypeCountsMap = new Map<string, Set<string>>();
    documents.forEach(d => {
      if (!eventTypeCountsMap.has(d.eventType)) eventTypeCountsMap.set(d.eventType, new Set());
      eventTypeCountsMap.get(d.eventType)!.add(d.userId || d.sessionId || 'unknown');
    });
    
    const eventTypeCounts = Array.from(eventTypeCountsMap.entries())
      .map(([type, usersSet]) => ({ type, count: usersSet.size }))
      .sort((a, b) => b.count - a.count);

    // Get 50 most recent activities
    const recentActivities = documents.slice(0, 50).map(d => ({
      eventType: d.eventType,
      itemId: d.itemId,
      itemType: d.itemType,
      itemTitle: d.itemTitle,
      duration: d.duration,
      userId: d.userId,
      sessionId: d.sessionId,
      timestamp: d.timestamp
    })) as AnalyticsEvent[];

    const userStatsMap = new Map<string, UserAnalytics>();
    documents.forEach(d => {
      const id = d.userId || d.sessionId;
      if (!id) return;
      
      if (!userStatsMap.has(id)) {
        userStatsMap.set(id, {
          id,
          isRegistered: !!d.userId,
          totalPlays: 0,
          totalDownloads: 0,
          totalSearches: 0,
          totalFavorites: 0,
          lastActive: d.timestamp || new Date().toISOString()
        });
      }
      
      const user = userStatsMap.get(id)!;
      // Update lastActive if newer
      if (d.timestamp && d.timestamp > user.lastActive) {
        user.lastActive = d.timestamp;
      }
      
      if (d.eventType === 'play_start') user.totalPlays++;
      if (d.eventType === 'download_complete') user.totalDownloads++;
      if (d.eventType === 'search') user.totalSearches++;
      if (d.eventType === 'favorite_add') user.totalFavorites++;
    });

    const userStats = Array.from(userStatsMap.values())
      .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

    return {
      totalPlays,
      totalDownloads,
      totalSearches,
      totalFavorites,
      playsByDay,
      topEpisodes,
      topSearches,
      eventTypeCounts,
      recentActivities,
      userStats
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
      eventTypeCounts: [],
      recentActivities: [],
      userStats: []
    };
  }
}