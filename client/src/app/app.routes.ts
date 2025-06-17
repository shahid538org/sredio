import { Routes } from '@angular/router';
import { GitHubIntegrationComponent } from './components/github-integration/github-integration.component';
import { GitHubCallbackComponent } from './components/github-callback/github-callback.component';

export const routes: Routes = [
  { path: '', component: GitHubIntegrationComponent },
  { path: 'github-callback', component: GitHubCallbackComponent },
  { path: '**', redirectTo: '' }
];
