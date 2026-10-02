// server/src/products/products.controller.js
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as productsService from './products.service.js';

/** Who is asking — decides which products are visible / editable (see products.service.js) */
const viewerOf = (req) => ({
  role: req.user?.role,
  vendorId: req.vendor?.id ?? null,
  inventoryType: req.vendor?.inventoryType ?? 'BOTH',
});

export const list = async (req, res) => {
  const { items, meta } = await productsService.list(req.validQuery, viewerOf(req));
  sendSuccess(res, items, 'OK', 200, meta);
};
export const getById = async (req, res) => sendSuccess(res, await productsService.getById(req.params.id, viewerOf(req)));
export const categories = async (_req, res) => sendSuccess(res, await productsService.categories());
export const create = async (req, res) => sendCreated(res, await productsService.create(req.body, viewerOf(req)), 'Product created');
export const update = async (req, res) => sendSuccess(res, await productsService.update(req.params.id, req.body, viewerOf(req)), 'Product updated');
export const remove = async (req, res) => sendSuccess(res, await productsService.remove(req.params.id, viewerOf(req)), 'Product hidden');
export const setVehicles = async (req, res) =>
  sendSuccess(res, await productsService.setVehicles(req.params.id, req.body.vehicleIds, viewerOf(req)), 'Vehicle mapping updated');