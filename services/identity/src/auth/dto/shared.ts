import { z } from 'zod';

/** Normalized email field — lowercased + trimmed. Reuse across all auth DTOs. */
export const emailField = z.string().trim().toLowerCase().email();
