// server/src/vehicles/vehicles.controller.js
import { ApiError } from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import { canStock, INVENTORY_TYPE_LABELS } from '../utils/inventoryType.js';
import * as vehiclesService from './vehicles.service.js';

export const list = async (req, res) => sendSuccess(res, await vehiclesService.list(req.validQuery));
export const brands = async (req, res) => sendSuccess(res, await vehiclesService.brands(req.validQuery.type));
export const models = async (req, res) => sendSuccess(res, await vehiclesService.models(req.validQuery.type, req.validQuery.brand));
export const years = async (req, res) =>
  sendSuccess(res, await vehiclesService.years(req.validQuery.type, req.validQuery.brand, req.validQuery.model));
export const create = async (req, res) => sendCreated(res, await vehiclesService.create(req.body), 'Vehicle added');
export const bulkCreate = async (req, res) => {
  // A vendor can only add vehicle types its shop sells (car-only shop → cars)
  if (req.vendor && !canStock(req.vendor.inventoryType, req.body.type)) {
    throw ApiError.forbidden(`Your shop sells ${INVENTORY_TYPE_LABELS[req.vendor.inventoryType].toLowerCase()} only`);
  }
  const r = await vehiclesService.bulkCreate(req.body);
  const what = r.isNewBrand ? 'Brand and model added' : r.isNewModel ? 'Model added' : r.created ? 'Years added' : 'Already in the list';
  sendCreated(res, r, what);
};
export const remove = async (req, res) => sendSuccess(res, await vehiclesService.remove(req.params.id), 'Vehicle removed');