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

// Наши поля товара → тег/колонка фида (ручной маппинг). Все поля необязательные.
const feedMappingSchema = z
  .object({
    sku: z.string().max(120).optional(),
    name: z.string().max(120).optional(),
    description: z.string().max(120).optional(),
    price: z.string().max(120).optional(),
    currency: z.string().max(120).optional(),
    url: z.string().max(120).optional(),
    imageUrl: z.string().max(120).optional(),
    category: z.string().max(120).optional(),
  })
  .optional();

export const importUrlSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  format: z.enum(['json', 'csv', 'xml']).optional(),
  // Тег элемента товара в XML (напр. offer/item). Если не задан — определяется автоматически.
  itemSelector: z.string().max(120).optional(),
  mapping: feedMappingSchema,
});

// Предпросмотр фида — то же, но без маппинга (он и подбирается на превью).
export const previewFeedSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  format: z.enum(['json', 'csv', 'xml']).optional(),
  itemSelector: z.string().max(120).optional(),
});

export default { createProductSchema, updateProductSchema, importUrlSchema, previewFeedSchema };
