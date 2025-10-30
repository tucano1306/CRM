// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      publicMetadata: { role: 'SELLER' },
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  ClerkProvider: ({ children }) => children,
  SignedIn: ({ children }) => children,
  SignedOut: () => null,
}))

// Mock Clerk Server
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => ({
    userId: 'test-user-id',
    sessionClaims: {
      role: 'SELLER',
      public_metadata: { role: 'SELLER' },
    },
  })),
  clerkMiddleware: jest.fn((handler) => handler),
  createRouteMatcher: jest.fn(() => jest.fn()),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    seller: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
