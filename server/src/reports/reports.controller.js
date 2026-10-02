import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as reportsService from './reports.service.js';

export const dashboard = async (req, res) => sendSuccess(res, await reportsService.dashboard(req.vendorId));
export const pnl = async (req, res) => sendSuccess(res, await reportsService.profitAndLoss(req.vendorId, req.validQuery));
export const gst = async (req, res) => sendSuccess(res, await reportsService.gstSummary(req.vendorId, req.validQuery));
export const listExpenses = async (req, res) => sendSuccess(res, await reportsService.listExpenses(req.vendorId, req.validQuery));
export const addExpense = async (req, res) => sendCreated(res, await reportsService.addExpense(req.vendorId, req.body), 'Expense added');
export const deleteExpense = async (req, res) => sendSuccess(res, await reportsService.deleteExpense(req.vendorId, req.params.id), 'Expense deleted');
