import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['support', 'sales', 'leads', 'custom']).default('support'),
  modelProvider: z.enum(['openai', 'anthropic']).optional(),
  modelName: z.string().optional(),
  systemPrompt: z.string().max(8000).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(['support', 'sales', 'leads', 'custom']).optional(),
  modelProvider: z.enum(['openai', 'anthropic']).optional(),
  modelName: z.string().optional(),
  systemPrompt: z.string().max(8000).optional(),
});

export const brandingSchema = z.object({
  // http(s)-ссылка или data:image (загруженный аватар хранится как data-URL, до ~256KB)
  avatarUrl: z
    .string()
    .max(400000)
    .refine((v) => /^https?:\/\//.test(v) || /^data:image\//.test(v), 'Ожидается URL или data:image')
    .nullable()
    .optional(),
  brandColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  // Пустая строка допустима — так владелец может убрать приветствие целиком.
  greeting: z.string().max(500).optional(),
  quickReplies: z.array(z.string().min(1).max(80)).max(6).optional(),
  widgetFormFactor: z.enum(['floating_chat', 'inline_block', 'side_panel', 'minimal_bubble']).optional(),
  position: z.enum(['bottom-right', 'bottom-left']).optional(),
  startMenu: z
    .object({
      enabled: z.boolean().optional(),
      items: z
        .array(
          z.object({
            type: z.enum(['chat', 'faq', 'contacts']),
            title: z.string().min(1).max(80),
            content: z.string().max(2000).optional(),
            // Структурированные данные для элемента «Контакты и график» (всё опционально).
            contacts: z
              .object({
                phone: z.string().max(50).optional(),
                email: z.string().max(160).optional(),
                address: z.string().max(300).optional(),
                schedule: z
                  .array(
                    z.object({
                      label: z.string().max(30),
                      enabled: z.boolean().optional(),
                      from: z.string().max(10).optional(),
                      to: z.string().max(10).optional(),
                    })
                  )
                  .max(7)
                  .optional(),
                socials: z
                  .object({
                    telegram: z.string().max(300).optional(),
                    whatsapp: z.string().max(300).optional(),
                    viber: z.string().max(300).optional(),
                    instagram: z.string().max(300).optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
        )
        .max(8)
        .optional(),
    })
    .optional(),
});

export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(/^(\*|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/i, 'Некорректный домен'),
});

export const settingsSchema = z.object({
  proactiveEnabled: z.boolean().optional(),
  proactiveMessage: z.string().max(500).optional(),
  proactiveDelaySeconds: z.number().int().min(1).max(300).optional(),
  exitIntentEnabled: z.boolean().optional(),
  exitIntentMessage: z.string().max(500).optional(),
  escalationEnabled: z.boolean().optional(),
  escalationKeywords: z.array(z.string().min(1).max(60)).max(20).optional(),
  autoLanguage: z.boolean().optional(),
  emailFallbackEnabled: z.boolean().optional(),
  // Что собирает форма захвата лида: email или телефон.
  leadContactType: z.enum(['email', 'phone']).optional(),
  // Сбор email при эскалации на оператора: тумблер + кастомное сообщение.
  enableEmailOnEscalation: z.boolean().optional(),
  escalationEmailMessage: z.string().max(500).optional(),
  // Персонализация приветствия для новых / вернувшихся посетителей.
  enableReturningGreeting: z.boolean().optional(),
  greetingNew: z.string().max(500).optional(),
  greetingReturning: z.string().max(500).optional(),
  // BYOK: собственный OpenAI-ключ агента. Пустая строка → сбросить (снова серверный ключ).
  openaiApiKey: z.string().max(200).nullable().optional(),
});

export default { createAgentSchema, updateAgentSchema, brandingSchema, addDomainSchema, settingsSchema };
