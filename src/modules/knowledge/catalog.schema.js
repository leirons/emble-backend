import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1).max(300),
  description: z.string().max(4000).optional().default(''),
  price: z.coerce.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().max(120).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const importUrlSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

export default { createProductSchema, updateProductSchema, importUrlSchema };
