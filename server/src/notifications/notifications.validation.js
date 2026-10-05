// server/src/notifications/notifications.validation.js
import { z } from 'zod';

export const listNotificationsQuery = z.object({
  before: z.coerce.date().optional(), // createdAt of the oldest notification already shown
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unread: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});