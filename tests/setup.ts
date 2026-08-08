import { vi } from "vitest";

// Prevent Prisma client initialization during unit tests
vi.mock("../app/lib/prism", () => ({
  prisma: {},
}));
