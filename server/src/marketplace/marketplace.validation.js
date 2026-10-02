// server/src/marketplace/marketplace.validation.js
import { z } from 'zod';
import { listProductsQuery } from '../products/products.validation.js';

export const browseQuery = listProductsQuery.omit({ includeInactive: true, owner: true }).extend({
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).default('relevance'),
});

export const validateCartSchema = z.object({
  items: z.array(z.object({ inventoryId: z.string().uuid(), quantity: z.coerce.number().int().min(1) })).max(50),
});