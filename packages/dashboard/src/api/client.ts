// ===== عطاء - API Client =====

const BASE_URL = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ غير متوقع');
    }

    return data;
  }

  // Auth
  async login(username: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Households
  async getHouseholds(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/households${query}`);
  }

  async getHousehold(id: string) {
    return this.request<any>(`/households/${id}`);
  }

  async getHouseholdByToken(token: string) {
    return this.request<any>(`/households/token/${token}`);
  }

  async createHousehold(data: any) {
    return this.request<any>('/households', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHousehold(id: string, data: any) {
    return this.request<any>(`/households/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Needs
  async getNeeds(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/needs${query}`);
  }

  async createNeed(data: any) {
    return this.request<any>('/needs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNeedStatus(id: string, status: string) {
    return this.request<any>(`/needs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Inventory
  async getInventory(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/inventory${query}`);
  }

  async createInventoryItem(data: any) {
    return this.request<any>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventory(id: string, data: any) {
    return this.request<any>(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Distributions
  async getDistributions(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/distributions${query}`);
  }

  async createDistribution(data: any) {
    return this.request<any>('/distributions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Offers & Requests
  async getOffers(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/offers${query}`);
  }

  async createOffer(data: any) {
    return this.request<any>('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRequests(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/requests${query}`);
  }

  async createRequest(data: any) {
    return this.request<any>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMatches(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/matches${query}`);
  }

  async updateMatchStatus(id: string, status: string) {
    return this.request<any>(`/matches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Dashboard
  async getDashboardSummary() {
    return this.request<any>('/dashboard/summary');
  }

  async getNeedsByZone() {
    return this.request<any>('/dashboard/needs-by-zone');
  }

  async getInventorySummary() {
    return this.request<any>('/dashboard/inventory');
  }

  async getDistributionStats() {
    return this.request<any>('/dashboard/distributions');
  }

  async getZones() {
    return this.request<any>('/dashboard/zones');
  }

  async getShelters(zoneId?: string) {
    const query = zoneId ? `?zone_id=${zoneId}` : '';
    return this.request<any>(`/dashboard/shelters${query}`);
  }

  // Sync
  async getSyncStatus() {
    return this.request<any>('/sync/status');
  }

  async pushSync() {
    return this.request<any>('/sync/push', { method: 'POST' });
  }

  async pullSync(zone_id: string) {
    return this.request<any>('/sync/pull', {
      method: 'POST',
      body: JSON.stringify({ zone_id }),
    });
  }

  async getSyncLog() {
    return this.request<any>('/sync/log');
  }

  // AI
  async getAIPriorityScore(householdId: string) {
    return this.request<any>(`/ai/priority-score/${householdId}`);
  }

  async recalculatePriorities() {
    return this.request<any>('/ai/recalculate-priorities', { method: 'POST' });
  }

  async predictNeeds(householdId: string) {
    return this.request<any>(`/ai/predict-needs/${householdId}`);
  }

  async optimizeAllocation(data?: { zone_id?: string; location_id?: string; max_households?: number }) {
    return this.request<any>('/ai/optimize-allocation', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async getAIAnalytics() {
    return this.request<any>('/ai/analytics');
  }
}

export const api = new ApiClient();
