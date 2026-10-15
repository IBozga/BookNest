import '@testing-library/jest-dom';

// Mock window.scrollTo in JSDOM
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
