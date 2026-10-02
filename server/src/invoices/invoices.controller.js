// server/src/invoices/invoices.controller.js
import { z } from 'zod';
import { sendSuccess } from '../utils/ApiResponse.js';
import * as invoicesService from './invoices.service.js';

const listQuery = z.object({
  q: z.string().trim().optional(),
  paymentMode: z.enum(['UPI', 'CASH', 'CARD', 'COD']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
export { listQuery };

export const list = async (req, res) => {
  const { items, meta } = await invoicesService.list(req.vendorId, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const getById = async (req, res) => sendSuccess(res, await invoicesService.getById(req.vendorId, req.params.id));

export const downloadPdf = async (req, res) => {
  const { invoice, buffer } = await invoicesService.pdfBuffer(req.vendorId, req.params.id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
};

export const publishPdf = async (req, res) => sendSuccess(res, await invoicesService.publishPdf(req.vendorId, req.params.id), 'PDF ready to share');