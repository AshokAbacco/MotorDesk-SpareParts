// server/src/admin/admin.controller.js
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as adminService from './admin.service.js';

export const analytics = async (_req, res) => sendSuccess(res, await adminService.analytics());
export const listVendors = async (req, res) => {
  const { items, meta } = await adminService.listVendors(req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const setVendorStatus = async (req, res) =>
  sendSuccess(res, await adminService.setVendorStatus(req.params.id, req.body.status), `Vendor ${req.body.status.toLowerCase()}`);

// Customers
export const listCustomers = async (req, res) => {
  const { items, meta } = await adminService.listCustomers(req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const createCustomer = async (req, res) => sendCreated(res, await adminService.createCustomer(req.body), 'Customer added');
export const updateCustomer = async (req, res) => {
  const r = await adminService.updateCustomer(req.params.id, req.body);
  sendSuccess(res, r, r.passwordChanged ? 'Customer updated · password reset' : 'Customer updated');
};
export const deleteCustomer = async (req, res) => {
  const result = await adminService.deleteCustomer(req.params.id);
  sendSuccess(res, result, result.message);
};
export const setCustomerStatus = async (req, res) =>
  sendSuccess(res, await adminService.setCustomerStatus(req.params.id, req.body.isActive), req.body.isActive ? 'Customer enabled' : 'Customer disabled');