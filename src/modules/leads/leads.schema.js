import { z } from 'zod';

export const captureLeadSchema = z.object({
  conversationId: z.string().uuid().optional(),
  name: z.string().max(200).optional(),
  email: z.string().max(254).email().optional(), // RFC 5321 max — .email() не ограничивает длину (ACM-30)
  phone: z.string().max(40).optional(),
  capturedFields: z.record(z.string(), z.any()).optional(),
});

export default { captureLeadSchema };
