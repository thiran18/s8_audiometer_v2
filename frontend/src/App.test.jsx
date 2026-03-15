import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

// Mock matchMedia which is often needed for modern apps but missing in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('App Initial Render', () => {
    it('renders without crashing', () => {
        // App contains a Suspense boundary with a PageLoader fallback which should render immediately while lazy routes load.
        const { container } = render(<App />);
        expect(container).toBeInTheDocument();
    });
});
