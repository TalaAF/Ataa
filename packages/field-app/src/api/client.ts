// ===== Field App - API Client =====

const BASE_URL = '/api';

class ApiClient {
  private token: string | null = null;
  private familyToken: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  setFamilyToken(token: string | null) {
    this.familyToken = token;
  }

  getFamilyToken(): string | null {
    return this.familyToken;
  }

  private async request<T>(path: string, options: RequestInit = {}, tokenOverride?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const effectiveToken = tokenOverride ?? this.token;
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
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

  async familyLogin(token: string) {
    return this.request<any>('/auth/family-login', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Households
  async getHouseholds(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/households${query}`);
  }

  async getHousehold(id: string) {
    return this.request<any>(`/households/${id}`);
  }

  async createHousehold(data: any) {
    return this.request<any>('/households', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Needs
  async createNeed(data: any) {
    return this.request<any>('/needs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Distributions
  async createDistribution(data: any) {
    return this.request<any>('/distributions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboardSummary() {
    return this.request<any>('/dashboard/summary');
  }

  // Public (no auth required)
  async getPublicZones() {
    return this.request<any>('/public/zones');
  }

  async getPublicShelters(zone_id?: string) {
    const query = zone_id ? `?zone_id=${zone_id}` : '';
    return this.request<any>(`/public/shelters${query}`);
  }

  async selfRegister(data: any) {
    return this.request<any>('/public/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkStatus(token: string) {
    return this.request<any>(`/public/status/${token}`);
  }

  // Family portal (token-based)
  async getFamilyPortal() {
    return this.request<any>('/family/portal/me', {}, this.familyToken || undefined);
  }

  async getFamilyNeeds() {
    return this.request<any>('/family/portal/needs', {}, this.familyToken || undefined);
  }

  async getFamilyDistributions() {
    return this.request<any>('/family/portal/distributions', {}, this.familyToken || undefined);
  }

  // Family exchange (token-based)
  async getFamilyOffers() {
    return this.request<any>('/family/exchange/offers', {}, this.familyToken || undefined);
  }

  async createFamilyOffer(data: any) {
    return this.request<any>('/family/exchange/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    }, this.familyToken || undefined);
  }

  async getFamilyRequests() {
    return this.request<any>('/family/exchange/requests', {}, this.familyToken || undefined);
  }

  async createFamilyRequest(data: any) {
    return this.request<any>('/family/exchange/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }, this.familyToken || undefined);
  }

  async getFamilyMatches() {
    return this.request<any>('/family/exchange/matches', {}, this.familyToken || undefined);
  }
}

export const api = new ApiClient();
