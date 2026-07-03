import { z } from 'zod';

export const captureLeadSchema = z.object({
  conversationId: z.string().uuid().optional(),
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  capturedFields: z.record(z.string(), z.any()).optional(),
});

export default { captureLeadSchema };
