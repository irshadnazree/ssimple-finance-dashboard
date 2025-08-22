import { vi } from 'vitest';

// Mock IndexedDB for testing
const mockIDBKeyRange = {
  bound: vi.fn(),
  only: vi.fn(),
  lowerBound: vi.fn(),
  upperBound: vi.fn(),
};

const mockIDBRequest = {
  result: null,
  error: null,
  source: null,
  transaction: null,
  readyState: 'done',
  onsuccess: null,
  onerror: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockIDBObjectStore = {
  add: vi.fn().mockReturnValue(mockIDBRequest),
  clear: vi.fn().mockReturnValue(mockIDBRequest),
  count: vi.fn().mockReturnValue(mockIDBRequest),
  delete: vi.fn().mockReturnValue(mockIDBRequest),
  get: vi.fn().mockReturnValue(mockIDBRequest),
  getAll: vi.fn().mockReturnValue(mockIDBRequest),
  getAllKeys: vi.fn().mockReturnValue(mockIDBRequest),
  getKey: vi.fn().mockReturnValue(mockIDBRequest),
  put: vi.fn().mockReturnValue(mockIDBRequest),
  openCursor: vi.fn().mockReturnValue(mockIDBRequest),
  openKeyCursor: vi.fn().mockReturnValue(mockIDBRequest),
  index: vi.fn(),
  createIndex: vi.fn(),
  deleteIndex: vi.fn(),
  indexNames: [],
  keyPath: '',
  name: '',
  transaction: null,
  autoIncrement: false,
};

const mockIDBTransaction = {
  abort: vi.fn(),
  commit: vi.fn(),
  objectStore: vi.fn().mockReturnValue(mockIDBObjectStore),
  db: null,
  durability: 'default',
  error: null,
  mode: 'readonly',
  objectStoreNames: [],
  onabort: null,
  oncomplete: null,
  onerror: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockIDBDatabase = {
  close: vi.fn(),
  createObjectStore: vi.fn().mockReturnValue(mockIDBObjectStore),
  deleteObjectStore: vi.fn(),
  transaction: vi.fn().mockReturnValue(mockIDBTransaction),
  name: 'test-db',
  objectStoreNames: [],
  version: 1,
  onabort: null,
  onclose: null,
  onerror: null,
  onversionchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockIDBOpenDBRequest = {
  ...mockIDBRequest,
  onblocked: null,
  onupgradeneeded: null,
};

const mockIndexedDB = {
  open: vi.fn().mockReturnValue(mockIDBOpenDBRequest),
  deleteDatabase: vi.fn().mockReturnValue(mockIDBRequest),
  databases: vi.fn().mockResolvedValue([]),
  cmp: vi.fn(),
};

// Set up global mocks
Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(globalThis, 'IDBKeyRange', {
  value: mockIDBKeyRange,
  writable: true,
});

// Mock crypto for encryption tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: vi.fn().mockImplementation((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
      digest: vi.fn(),
      deriveBits: vi.fn(),
      deriveKey: vi.fn(),
      wrapKey: vi.fn(),
      unwrapKey: vi.fn(),
    },
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(globalThis, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});