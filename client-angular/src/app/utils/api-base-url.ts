import { isDevMode } from '@angular/core';

export function apiBaseUrl(): string {
  // Production build: .NET serves the client, so the API is the same origin.
  if (!isDevMode()) {
    return '';
  }

  const { hostname } = window.location;
  if (hostname.endsWith('.app.github.dev')) {
    // Codespaces: swap the Angular port (4200) for the API's port (5223)
    const apiHost = hostname.replace(/-4200\.app\.github\.dev$/, '-5223.app.github.dev');
    return `https://${apiHost}`;
  }
  return 'http://localhost:5223'; // ng serve on localhost
}