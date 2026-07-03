import { z } from 'zod';

const tagsSchema = z.array(z.string().min(1).max(40)).max(5).optional();
const headersSchema = z.record(z.string(), z.string()).optional();

export const addUrlSourceSchema = z.object({
  url: z.string().url(),
  title: z.string().max(200).optional(),
  tags: tagsSchema,
  // от 15 минут до 30 дней; отсутствие поля = без автосинхронизации
  syncIntervalMinutes: z.number().int().min(15).max(43200).optional(),
  // произвольные заголовки к запросу (например Authorization для защищённых страниц/API)
  headers: headersSchema,
});

export const addTextSourceSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(200000),
  tags: tagsSchema,
});

export const updateSourceSchema = z.object({
  tags: tagsSchema,
  syncIntervalMinutes: z.number().int().min(15).max(43200).nullable().optional(),
  headers: headersSchema,
});

export default { addUrlSourceSchema, addTextSourceSchema, updateSourceSchema };
