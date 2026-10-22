import { sendSuccess } from '../utils/ApiResponse.js';
import * as vendorsService from './vendors.service.js';

export const getShop = async (req, res) => sendSuccess(res, await vendorsService.getShop(req.vendorId));
export const updateShop = async (req, res) => sendSuccess(res, await vendorsService.updateShop(req.vendorId, req.body), 'Shop updated');

export const getUpi = async (req, res) => sendSuccess(res, await vendorsService.getUpi(req.vendorId));
export const updateUpi = async (req, res) => sendSuccess(res, await vendorsService.updateUpi(req.vendorId, req.body), 'UPI details saved');
export const removeUpi = async (req, res) => sendSuccess(res, await vendorsService.removeUpi(req.vendorId), 'UPI details removed');
export const getOrderSettings = async (req, res) => sendSuccess(res, await vendorsService.getOrderSettings(req.vendorId));
export const updateOrderSettings = async (req, res) =>
  sendSuccess(res, await vendorsService.updateOrderSettings(req.vendorId, req.body), 'Order options saved');
