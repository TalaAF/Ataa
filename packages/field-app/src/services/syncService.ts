import axios, { AxiosInstance } from 'axios';
import { getSyncQueue, clearSyncQueue, markAsSynced, getDB } from '../db/offlineDb';
import { SyncPayload, SyncResponse } from '@ataa/shared';

const API_BASE_URL = import.meta.env.VITE_HUB_API_URL || 'http://localhost:3000/api';

class SyncService {
  private api: AxiosInstance;
  private isSyncing = false;
  private lastSyncTime: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async sync(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      return { success: false, message: 'No internet connection' };
    }

    this.isSyncing = true;

    try {
      // Get all pending changes from sync queue
      const queue = await getSyncQueue();

      if (queue.length === 0) {
        this.isSyncing = false;
        return { success: true, message: 'Nothing to sync' };
      }

      // Group by entity type
      const payload: Partial<SyncPayload> = {
        hub_id: this.getHubId(),
        timestamp: new Date().toISOString(),
        households: [],
        members: [],
        needs: [],
        distributions: [],
        offers: [],
        requests: [],
        audit_logs: [],
      };

      for (const item of queue) {
        switch (item.entity_type) {
          case 'household':
            payload.households!.push(item.data);
            break;
          case 'member':
            payload.members!.push(item.data);
            break;
          case 'need':
            payload.needs!.push(item.data);
            break;
          case 'distribution':
            payload.distributions!.push(item.data);
            break;
        }
      }

      // Push to server
      const response = await this.api.post<{ success: boolean; data: SyncResponse }>(
        '/sync/push',
        payload
      );

      if (response.data.success) {
        // Mark items as synced
        for (const item of queue) {
          await markAsSynced(item.entity_type, item.entity_id);
        }

        // Clear sync queue
        await clearSyncQueue();

        // Update last sync time
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem('last_sync_time', this.lastSyncTime);

        this.isSyncing = false;
        return { 
          success: true, 
          message: `Synced ${queue.length} items successfully` 
        };
      } else {
        this.isSyncing = false;
        return { success: false, message: 'Sync failed on server' };
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      this.isSyncing = false;
      return { 
        success: false, 
        message: error.response?.data?.error || 'Sync failed' 
      };
    }
  }

  async pullUpdates(): Promise<{ success: boolean; message: string }> {
    if (!navigator.onLine) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const zone_id = user.zone_id;

      if (!zone_id) {
        return { success: false, message: 'No zone assigned to user' };
      }

      const response = await this.api.post<{ success: boolean; data: SyncResponse }>(
        '/sync/pull',
        {
          hub_id: this.getHubId(),
          since_timestamp: this.lastSyncTime || '1970-01-01T00:00:00Z',
          zone_id,
        }
      );

      if (response.data.success && response.data.data.updates) {
        const updates = response.data.data.updates;
        const db = await getDB();

        // Update local database with server data
        if (updates.households) {
          for (const household of updates.households) {
            await db.put('households', household);
          }
        }

        if (updates.members) {
          for (const member of updates.members) {
            await db.put('members', member);
          }
        }

        if (updates.needs) {
          for (const need of updates.needs) {
            await db.put('needs', need);
          }
        }

        this.lastSyncTime = response.data.data.server_timestamp;
        localStorage.setItem('last_sync_time', this.lastSyncTime);

        return { success: true, message: 'Updates pulled successfully' };
      }

      return { success: false, message: 'Pull failed' };
    } catch (error: any) {
      console.error('Pull error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Pull failed' 
      };
    }
  }

  async autoSync(): Promise<void> {
    // Try to sync every 5 minutes if online and there are pending changes
    setInterval(async () => {
      if (navigator.onLine) {
        const queue = await getSyncQueue();
        if (queue.length > 0) {
          console.log('Auto-syncing...');
          await this.sync();
        }
        // Also pull updates
        await this.pullUpdates();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  getLastSyncTime(): string | null {
    return this.lastSyncTime || localStorage.getItem('last_sync_time');
  }

  private getHubId(): string {
    let hubId = localStorage.getItem('hub_id');
    if (!hubId) {
      hubId = `hub-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('hub_id', hubId);
    }
    return hubId;
  }
}

export const syncService = new SyncService();
