import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// localStorage mock (jsdom has a real but limited impl; we reset between tests)
// ---------------------------------------------------------------------------
beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Silence specific console noise from tests
// ---------------------------------------------------------------------------
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('ReactDOM.render')) return;
    originalWarn(...args);
  };
});
afterAll(() => {
  console.warn = originalWarn;
});
