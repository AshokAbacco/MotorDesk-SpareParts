import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as subsService from './subscriptions.service.js';

export const listActivePlans = async (_req, res) => sendSuccess(res, await subsService.listActivePlans());
export const listAllPlans = async (_req, res) => sendSuccess(res, await subsService.listAllPlans());
export const createPlan = async (req, res) => sendCreated(res, await subsService.createPlan(req.body), 'Plan created');
export const updatePlan = async (req, res) => sendSuccess(res, await subsService.updatePlan(req.params.id, req.body), 'Plan updated');
export const deactivatePlan = async (req, res) => sendSuccess(res, await subsService.deactivatePlan(req.params.id), 'Plan deactivated');
export const current = async (req, res) => sendSuccess(res, await subsService.current(req.vendorId));
export const subscribe = async (req, res) => {
  const result = await subsService.subscribe(req.user, req.vendorId, req.body.planId);
  sendCreated(res, result, result.payment ? 'Complete the payment to activate' : 'Subscribed');
};