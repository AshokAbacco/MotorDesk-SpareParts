import { z } from 'zod';

export const rangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const expenseSchema = z.object({
  title: z.string().trim().min(2),
  category: z.enum(['RENT', 'SALARY', 'ELECTRICITY', 'TRANSPORT', 'PURCHASE', 'MAINTENANCE', 'OTHER']).default('OTHER'),
  amount: z.coerce.number().positive(),
  date: z.coerce.date().default(() => new Date()),
});
