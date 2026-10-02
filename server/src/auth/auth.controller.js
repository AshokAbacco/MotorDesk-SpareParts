import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as authService from './auth.service.js';

export const register = async (req, res) => sendCreated(res, await authService.register(req.body), 'Registered successfully');
export const login = async (req, res) => sendSuccess(res, await authService.login(req.body), 'Logged in');
export const me = async (req, res) => sendSuccess(res, await authService.me(req.user.id));
