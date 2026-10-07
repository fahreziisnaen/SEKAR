import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom tidak mengimplementasikan scrollTo maupun object URL.
window.scrollTo = (() => {}) as typeof window.scrollTo;
URL.createObjectURL ??= () => 'blob:uji';
URL.revokeObjectURL ??= () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
