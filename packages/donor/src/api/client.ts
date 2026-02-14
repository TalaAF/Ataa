// ===== Donor Portal - API Client =====

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

  // Donor endpoints
  async getDashboard() {
    return this.request<any>('/donor/dashboard');
  }

  async getAggregatedNeeds(zoneId?: string) {
    const query = zoneId ? `?zone_id=${zoneId}` : '';
    return this.request<any>(`/donor/aggregated-needs${query}`);
  }

  async getZones() {
    return this.request<any>('/donor/zones');
  }

  async getPledges() {
    return this.request<any>('/donor/pledges');
  }

  async createPledge(data: { zone_id?: string; category: string; quantity: number; description?: string }) {
    return this.request<any>('/donor/pledges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePledgeStatus(id: string, status: string) {
    return this.request<any>(`/donor/pledges/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const api = new ApiClient();
