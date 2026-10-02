import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as posService from './pos.service.js';

export const quote = async (req, res) => sendSuccess(res, await posService.quote(req.vendor, req.body));
export const checkout = async (req, res) => sendCreated(res, await posService.checkout(req.vendor, req.body), 'Bill generated');
