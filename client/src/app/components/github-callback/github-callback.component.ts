import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <div class="callback-container">
      <mat-spinner *ngIf="loading" diameter="40"></mat-spinner>
      <div *ngIf="!loading" class="status-message">
        <mat-icon [color]="success ? 'primary' : 'warn'" class="status-icon">
          {{ success ? 'check_circle' : 'error' }}
        </mat-icon>
        <p>{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      padding: 2rem;
    }
    .status-message {
      text-align: center;
    }
    .status-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
    }
  `]
})
export class GitHubCallbackComponent implements OnInit {
  loading = true;
  success = false;
  message = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.success = params['success'] === 'true';
      this.message = this.success
        ? 'Successfully connected to GitHub!'
        : `Failed to connect to GitHub: ${params['error'] || 'Unknown error'}`;
      
      this.loading = false;

      // Show snackbar
      this.snackBar.open(this.message, 'Close', {
        duration: 5000
      });

      // Redirect after a delay
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 3000);
    });
  }
} 