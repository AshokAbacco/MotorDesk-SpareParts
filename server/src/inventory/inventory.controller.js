// server/src/inventory/inventory.controller.js
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as inventoryService from './inventory.service.js';

export const list = async (req, res) => {
  const { items, meta } = await inventoryService.list(req.vendorId, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const getById = async (req, res) => sendSuccess(res, await inventoryService.getById(req.vendorId, req.params.id));
export const add = async (req, res) => sendCreated(res, await inventoryService.add(req.vendorId, req.body, req.vendor.inventoryType), 'Added to inventory');
export const update = async (req, res) => sendSuccess(res, await inventoryService.update(req.vendorId, req.params.id, req.body), 'Price updated');
export const adjustStock = async (req, res) =>
  sendSuccess(res, await inventoryService.adjustStock(req.vendorId, req.params.id, req.body), 'Stock updated');
export const remove = async (req, res) => sendSuccess(res, await inventoryService.remove(req.vendorId, req.params.id), 'Removed');