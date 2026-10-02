// server/src/garages/garages.controller.js
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as garagesService from './garages.service.js';

export const list = async (req, res) => {
  const { items, meta } = await garagesService.list(req.vendorId, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const getById = async (req, res) => sendSuccess(res, await garagesService.getById(req.vendorId, req.params.id));
export const create = async (req, res) => sendCreated(res, await garagesService.create(req.vendorId, req.body), 'Garage added');
export const update = async (req, res) => sendSuccess(res, await garagesService.update(req.vendorId, req.params.id, req.body), 'Garage updated');
export const remove = async (req, res) => sendSuccess(res, await garagesService.remove(req.vendorId, req.params.id), 'Garage deleted');