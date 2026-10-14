import { z } from "zod";

export const RESERVED_HANDLES = new Set([
  "admin", "api", "app", "auth", "c", "checkout", "dashboard", "login", "signup", "logout",
  "library", "orders", "explore", "pricing", "help", "support", "static", "_next", "tysonpe",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{2,29}$/, "3–30 chars: letters, numbers, hyphens")
  .refine((h) => !RESERVED_HANDLES.has(h), "That handle is reserved");

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "product";
