import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as ordersService from './orders.service.js';

export const create = async (req, res) => sendCreated(res, await ordersService.create(req.user, req.body), 'Order placed');

export const listMine = async (req, res) => {
  const { items, meta } = await ordersService.listForCustomer(req.user.id, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const getMine = async (req, res) => sendSuccess(res, await ordersService.getById(req.params.id, { customerId: req.user.id }));
export const cancelMine = async (req, res) => sendSuccess(res, await ordersService.cancelByCustomer(req.user.id, req.params.id), 'Order cancelled');

export const listVendor = async (req, res) => {
  const { items, meta } = await ordersService.listForVendor(req.vendorId, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const getVendor = async (req, res) => sendSuccess(res, await ordersService.getById(req.params.id, { vendorId: req.vendorId }));
export const upiDetails = async (req, res) => sendSuccess(res, await ordersService.getUpiDetails(req.user.id, req.params.id));
export const submitUpi = async (req, res) =>
  sendSuccess(res, await ordersService.submitUpiRef(req.user.id, req.params.id, req.body.utr), 'Payment submitted — the shop will confirm it shortly');
export const verifyUpi = async (req, res) =>
  sendSuccess(res, await ordersService.verifyUpiPayment(req.vendorId, req.params.id, req.body.action), req.body.action === 'CONFIRM' ? 'Payment confirmed' : 'Order cancelled — payment not received');
export const updateStatus = async (req, res) =>
  sendSuccess(res, await ordersService.updateStatus(req.vendorId, req.params.id, req.body.status), 'Status updated');