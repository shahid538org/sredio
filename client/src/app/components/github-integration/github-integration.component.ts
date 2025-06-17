import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridModule } from 'ag-grid-angular';
import { GridOptions, ColDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { GithubService } from '../../services/github.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { GitHubDataService } from '../../services/github-data.service';
import { retry, catchError, throwError } from 'rxjs';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-github-integration',
  templateUrl: './github-integration.component.html',
  styleUrls: ['./github-integration.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatSnackBarModule,
    AgGridModule
  ]
})
export class GitHubIntegrationComponent implements OnInit {
  isConnected = false;
  isLoading = true;
  username = '';
  connectedAt: string | null = null;
  repositories: any[] = [];
  adminName = '';
  lastSynced = '';
  syncType = '';
  errorMsg = '';
  collections: string[] = [];
  selectedCollection: string = '';
  searchTerm: string = '';
  collectionData: any[] = [];
  collectionPagination: any = null;
  isCollectionLoading = false;
  currentPage = 1;

  columnDefs: ColDef[] = [
    { headerName: 'ID', field: '_id', sortable: true, filter: true, resizable: true }
  ];
  rowData = [
    { name: 'sredio', description: 'Sredio main repo', language: 'TypeScript', stars: 120, updated: '2024-05-01' },
    { name: 'sredio-server', description: 'Backend API', language: 'Node.js', stars: 80, updated: '2024-04-20' },
    { name: 'sredio-client', description: 'Frontend Angular', language: 'TypeScript', stars: 95, updated: '2024-04-18' },
    { name: 'sredio-docs', description: 'Documentation', language: 'Markdown', stars: 30, updated: '2024-03-30' }
  ];
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 120,
    resizable: true,
    filter: true,
    sortable: true
  };
  gridOptions: GridOptions = {
    pagination: true,
    paginationPageSize: 10,
    rowSelection: 'single',
    domLayout: 'normal',
    suppressCellFocus: true
  };

  constructor(
    private githubService: GithubService,
    private githubDataService: GitHubDataService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.githubService.getIntegrationStatus().subscribe({
      next: data => {
        this.isConnected = data.connected;
        this.adminName = data.githubUsername;
        this.lastSynced = data.connectedAt;
        this.syncType = data.syncType || '';
        this.isLoading = false;
      },
      error: err => {
        this.errorMsg = 'Failed to load integration status.';
        this.isLoading = false;
      }
    });
    this.loadCollections();
  }

  loadCollections() {
    this.githubDataService.getCollections().subscribe(collections => {
      this.collections = collections;
      if (collections.length > 0) {
        this.selectedCollection = collections[0];
        this.loadCollectionData();
      }
    });
  }

  onCollectionChange() {
    this.searchTerm = '';
    this.loadCollectionData();
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.loadCollectionData();
  }

  loadCollectionData(page: number = 1) {
    if (!this.selectedCollection) return;
    
    this.isCollectionLoading = true;
    this.currentPage = page;
    
    this.githubDataService.getData(this.selectedCollection, page, 10, this.searchTerm)
      .pipe(
        retry(3),
        catchError(error => {
          console.error('Error loading collection data:', error);
          this.showError('Failed to load data. Please try again.');
          this.isCollectionLoading = false;
          return throwError(() => error);
        })
      )
      .subscribe({
        next: res => {
          this.collectionData = Array.isArray(res.data) ? res.data : [];
          this.collectionPagination = res.pagination;
          
          if (this.collectionData.length > 0) {
            const allKeys = Object.keys(this.collectionData[0]);
            const orderedKeys = [
              'name',
              'owner',
              ...allKeys.filter(key => key !== 'name' && key !== 'owner')
            ];

            this.columnDefs = orderedKeys.map(key => ({
              headerName: key.charAt(0).toUpperCase() + key.slice(1),
              field: key,
              sortable: true,
              filter: true,
              resizable: true,
              valueGetter: params => {
                const value = params.data[key];
                if (value && typeof value === 'object') {
                  if (value.name) return value.name;
                  if (value.login) return value.login;
                  if (value.title) return value.title;
                  return JSON.stringify(value);
                }
                return value;
              }
            }));
          }
          this.isCollectionLoading = false;
        },
        error: err => {
          console.error('Error in subscription:', err);
          this.collectionData = [];
          this.collectionPagination = null;
          this.isCollectionLoading = false;
        }
      });
  }

  onSearchInput(event: any) {
    const value = event.target.value;
    this.onSearchChange(value);
  }

  onClearSearch() {
    this.searchTerm = '';
    this.loadCollectionData();
  }

  onPageChange(page: number) {
    this.loadCollectionData(page);
  }

  async checkConnectionStatus() {
    try {
      this.isLoading = true;
      const status = await this.githubService.checkConnectionStatus();
      this.isConnected = status.isConnected;
      if (this.isConnected) {
        this.username = status.username;
        this.connectedAt = status.connectedAt;
        await this.loadRepositories();
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      this.showError('Failed to check connection status');
    } finally {
      this.isLoading = false;
    }
  }

  async connectToGitHub() {
    try {
      const authUrl = await this.githubService.getAuthUrl();
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      this.showError('Failed to connect to GitHub');
    }
  }

  async loadRepositories() {
    try {
      this.isLoading = true;
      this.repositories = await this.githubService.getRepositories();
    } catch (error) {
      console.error('Error loading repositories:', error);
      this.showError('Failed to load repositories');
    } finally {
      this.isLoading = false;
    }
  }

  async removeIntegration() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Remove Integration',
        message: 'Are you sure you want to remove GitHub authorization? This will delete all synced data.',
        confirmText: 'Remove',
        cancelText: 'Cancel'
      }
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result === true) {
      try {
        this.isLoading = true;
        // Call backend to remove integration and clean up data
        await this.githubService.removeIntegration();
        
        // Clear all local storage and session storage
        localStorage.removeItem('github_token');
        sessionStorage.removeItem('github_token');
        
        // Reset all state variables
        this.isConnected = false;
        this.adminName = '';
        this.lastSynced = '';
        this.syncType = '';
        this.collections = [];
        this.selectedCollection = '';
        this.collectionData = [];
        this.collectionPagination = null;
        this.searchTerm = '';
        this.currentPage = 1;
        
        // Show success message
        this.showSuccess('GitHub integration removed successfully');
      } catch (error) {
        console.error('Error removing integration:', error);
        this.showError('Failed to remove GitHub integration');
      } finally {
        this.isLoading = false;
      }
    }
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }
}
