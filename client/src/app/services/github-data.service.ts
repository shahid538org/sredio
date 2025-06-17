import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

interface PaginationResponse {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GitHubDataService {
  private apiUrl = `${environment.apiUrl}/github`;

  constructor(private http: HttpClient) { }

  syncOrganization(orgName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/organization/${orgName}`, {});
  }

  syncRepository(orgName: string, repoName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/repository/${orgName}/${repoName}`, {});
  }

  getCollections(): Observable<string[]> {
    return this.http.get<{ available: string[] }>(`${this.apiUrl}/collections`)
      .pipe(
        map(response => response.available)
      );
  }

  getData(collection: string, page: number = 1, pageSize: number = 10, search?: string): Observable<PaginationResponse> {
    let url = `${this.apiUrl}/data/${collection}?page=${page}&pageSize=${pageSize}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    return this.http.get<any>(url).pipe(
      map(response => {
        console.log('Raw response:', response);

        // Handle different response formats
        let dataArray: any[];
        if (Array.isArray(response)) {
          dataArray = response;
        } else if (response && typeof response === 'object') {
          dataArray = response.data || [];
        } else {
          dataArray = [];
        }

        // Filter out initialization documents
        const filteredData = dataArray.filter(item => {
          if (!item || typeof item !== 'object') return false;
          
          const id = item._id || item.id;
          if (!id) return true;

          return !['init_org', 'init_repo', 'init_commit', 'init_pr', 'init_issue', 'init_changelog', 'init_member'].includes(id);
        });

        // Ensure we have pagination data
        const pagination = response.pagination || {
          total: filteredData.length,
          page: page,
          limit: pageSize,
          pages: Math.ceil(filteredData.length / pageSize)
        };

        return {
          data: filteredData,
          pagination: pagination
        };
      })
    );
  }

  getCollectionSchema(collection: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/schema/${collection}`);
  }
} 