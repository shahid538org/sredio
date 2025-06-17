import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

export interface GitHubStatus {
  isConnected: boolean;
  username: string;
  connectedAt: string;
}

export interface Repository {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async checkConnectionStatus(): Promise<GitHubStatus> {
    const response = await this.http.get<GitHubStatus>(`${this.apiUrl}/github/status`).toPromise();
    if (!response) {
      throw new Error('Failed to check connection status');
    }
    return response;
  }

  async getRepositories(): Promise<Repository[]> {
    const response = await this.http.get<Repository[]>(`${this.apiUrl}/github/repositories`).toPromise();
    if (!response) {
      throw new Error('Failed to get repositories');
    }
    return response;
  }

  async getAuthUrl(): Promise<string> {
    const timestamp = new Date().getTime();
    const response = await this.http.get<{ authUrl: string }>(`${this.apiUrl}/github/auth-url?timestamp=${timestamp}`).toPromise();
    if (!response) {
      throw new Error('Failed to get auth URL');
    }
    return response.authUrl;
  }

  async removeIntegration(): Promise<void> {
    try {
      await this.http.delete(`${this.apiUrl}/github/remove`).toPromise();
    } catch (error) {
      console.error('Error in removeIntegration:', error);
      throw new Error('Failed to remove GitHub integration');
    }
  }

  getIntegrationStatus() {
    return this.http.get<any>(`${this.apiUrl}/github/status`);
  }
} 