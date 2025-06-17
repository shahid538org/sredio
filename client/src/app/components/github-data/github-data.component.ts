import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { GridOptions, GridReadyEvent, ColDef, PaginationChangedEvent } from 'ag-grid-community';
import { GitHubDataService } from '../../services/github-data.service';
import { GitHubService } from '../../services/github.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

interface PaginationResponse {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

@Component({
  selector: 'app-github-data',
  template: `
    <div class="container">
      <div class="controls">
        <mat-form-field appearance="outline">
          <mat-label>Select Collection</mat-label>
          <mat-select [(ngModel)]="selectedCollection" (selectionChange)="onCollectionChange()">
            <mat-option *ngFor="let collection of collections" [value]="collection">
              {{collection}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search</mat-label>
          <input matInput
                 [(ngModel)]="searchText"
                 (input)="onInputChange($event)"
                 placeholder="Type to search...">
          <button mat-icon-button matSuffix *ngIf="searchText" (click)="clearSearch()">
            <mat-icon>close</mat-icon>
          </button>
        </mat-form-field>

        <button mat-raised-button color="primary" (click)="syncData()" [disabled]="!isConnected || isSyncing" class="sync-button">
          <mat-icon [class.spinning]="isSyncing">sync</mat-icon>
          {{ isSyncing ? 'Syncing...' : 'Sync Data' }}
        </button>
      </div>

      <div class="grid-container">
        <ag-grid-angular
          #agGrid
          style="width: 100%; height: 600px;"
          class="ag-theme-material"
          [gridOptions]="gridOptions"
          [columnDefs]="gridOptions.columnDefs"
          [rowData]="gridOptions.rowData"
          (gridReady)="onGridReady($event)">
        </ag-grid-angular>
      </div>

      <div *ngIf="loading" class="loading">
        Loading...
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .controls {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .search-field {
      min-width: 300px;
      margin: 0;
    }

    .grid-container {
      flex: 1;
      min-height: 400px;
      margin-top: 20px;
    }

    .mat-mdc-form-field {
      margin: 0;
    }

    .sync-button {
      height: 56px;
      margin: 0;
      padding-top: 0;
      padding-bottom: 0;
      background-color: #1976d2;
      color: white;
    }

    .sync-button:disabled {
      background-color: rgba(0, 0, 0, 0.12);
      color: rgba(0, 0, 0, 0.26);
    }

    .loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 20px;
      border-radius: 4px;
    }

    ::ng-deep .ag-theme-material {
      --ag-header-height: 50px;
      --ag-header-foreground-color: #000;
      --ag-header-background-color: #f5f5f5;
      --ag-odd-row-background-color: #fafafa;
      --ag-header-cell-hover-background-color: #e0e0e0;
      --ag-row-hover-color: #f5f5f5;
      height: 100%;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    AgGridModule
  ],
  providers: [
    GitHubDataService,
    GitHubService
  ]
})
export class GitHubDataComponent implements OnInit, OnDestroy {
  @ViewChild('agGrid') agGrid!: AgGridAngular;

  collections: string[] = [];
  selectedCollection: string = '';
  searchText: string = '';
  loading: boolean = false;
  isSyncing: boolean = false;
  isConnected: boolean = false;
  rowData: any[] = [];
  private currentPage = 1;
  private pageSize = 10;
  private totalRows = 0;
  private isDataLoading = false;
  private destroy$ = new Subject<void>();

  private defaultColumnDefs: ColDef[] = [
      {
        field: 'name',
        headerName: 'Repository Name',
        minWidth: 200,
        flex: 2,
        autoHeight: true,
        wrapText: true
      },
      {
        field: 'owner.login',
        headerName: 'Owner',
        minWidth: 150,
        flex: 1,
        autoHeight: true,
        wrapText: true
      },
      {
        field: 'description',
        headerName: 'Description',
        minWidth: 300,
        flex: 2,
        autoHeight: true,
        wrapText: true
      },
      {
        field: 'language',
        headerName: 'Language',
        minWidth: 120,
        flex: 1
      },
      {
        field: 'stargazers_count',
        headerName: 'Stars',
        minWidth: 100,
        flex: 1
      },
      {
        field: 'forks_count',
        headerName: 'Forks',
        minWidth: 100,
        flex: 1
      },
      {
        field: 'open_issues_count',
        headerName: 'Open Issues',
        minWidth: 120,
        flex: 1
      },
      {
        field: 'default_branch',
        headerName: 'Default Branch',
        minWidth: 150,
        flex: 1
      },
      {
        field: 'visibility',
        headerName: 'Visibility',
        minWidth: 120,
        flex: 1
      },
      {
        field: 'created_at',
        headerName: 'Created At',
        minWidth: 180,
        flex: 1,
        valueFormatter: (params) => {
          return params.value ? new Date(params.value).toLocaleString() : '';
        }
      },
      {
      field: 'updated_at',
      headerName: 'Updated At',
        minWidth: 180,
        flex: 1,
        valueFormatter: (params) => {
          return params.value ? new Date(params.value).toLocaleString() : '';
        }
      }
    ];

  gridOptions: GridOptions = {
    columnDefs: this.defaultColumnDefs,
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 150,
      flex: 1
    },
      pagination: true,
      paginationPageSize: 10,
      paginationPageSizeSelector: [10, 25, 50, 100],
      suppressPaginationPanel: false,
    onGridReady: this.onGridReady.bind(this)
  };

  constructor(
    private githubDataService: GitHubDataService,
    private githubService: GitHubService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.checkConnectionStatus();
    this.loadCollections();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkConnectionStatus() {
    this.githubService.getIntegrationStatus().subscribe(
      status => {
        this.isConnected = status.connected;
        if (status.connected) {
          this.syncData();
        }
      },
      error => {
        console.error('Error checking connection status:', error);
        this.snackBar.open('Error checking connection status', 'Close', { duration: 3000 });
      }
    );
  }

  syncData() {
    if (!this.isConnected || this.isSyncing) return;

    this.isSyncing = true;
    this.githubService.syncData().subscribe(
      () => {
        this.snackBar.open('Data sync completed successfully', 'Close', { duration: 3000 });
        this.loadCollections();
        this.isSyncing = false;
      },
      error => {
        console.error('Error syncing data:', error);
        this.snackBar.open('Error syncing data', 'Close', { duration: 3000 });
        this.isSyncing = false;
      }
    );
  }

  onGridReady(params: GridReadyEvent) {
    params.api.sizeColumnsToFit();
  }

  loadCollections() {
    this.loading = true;
    this.githubDataService.getCollections().subscribe(
      collections => {
        this.collections = collections;
        this.loading = false;
      },
      error => {
        console.error('Error loading collections:', error);
        this.snackBar.open('Error loading collections', 'Close', { duration: 3000 });
        this.loading = false;
      }
    );
  }

  onCollectionChange() {
    if (this.selectedCollection) {
      if (this.selectedCollection === 'githubcommits') {
        this.gridOptions.columnDefs = [
          {
            field: 'sha',
            headerName: 'Commit SHA',
            minWidth: 100,
            flex: 1
          },
          {
            field: 'commit.message',
            headerName: 'Commit Message',
            minWidth: 300,
            flex: 2,
            autoHeight: true,
            wrapText: true
          },
          {
            field: 'commit.author.name',
            headerName: 'Author Name',
            minWidth: 150,
            flex: 1
          },
          {
            field: 'commit.author.email',
            headerName: 'Author Email',
            minWidth: 200,
            flex: 1
          },
          {
            field: 'commit.author.date',
            headerName: 'Author Date',
            minWidth: 180,
            flex: 1,
            valueFormatter: (params) => {
              return params.value ? new Date(params.value).toLocaleString() : '';
            }
          }
        ];
      } else {
        this.gridOptions.columnDefs = this.defaultColumnDefs;
      }

      this.loadData();
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    this.loadData();
  }

  clearSearch() {
    this.searchText = '';
    this.loadData();
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    
    if (this.agGrid && this.agGrid.api) {
      this.gridOptions.quickFilterText = this.searchText;
      this.agGrid.api.onFilterChanged();
      }
  }

  loadData() {
    if (!this.selectedCollection || this.isDataLoading) return;

    this.isDataLoading = true;
    this.loading = true;

    this.githubDataService.getData(
      this.selectedCollection,
      this.currentPage,
      this.pageSize,
      this.searchText
    ).pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.totalRows = response.pagination.total;
          
          this.gridOptions.rowData = response.data;
          
          if (this.agGrid?.api) {
            this.agGrid.api.setRowCount(this.totalRows);
            this.agGrid.api.paginationGoToPage(this.currentPage - 1);
              this.agGrid.api.refreshCells();
              this.agGrid.api.sizeColumnsToFit();
          }
        } else {
          this.gridOptions.rowData = [];
          if (this.agGrid?.api) {
            this.agGrid.api.setRowCount(0);
          }
        }
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
        this.gridOptions.rowData = [];
        if (this.agGrid?.api) {
          this.agGrid.api.setRowCount(0);
        }
      },
      complete: () => {
        this.loading = false;
        this.isDataLoading = false;
      }
    });
  }

  private formatHeaderName(name: string): string {
    return name
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
} 