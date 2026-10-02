// server/src/users/users.controller.js
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as usersService from './users.service.js';

export const getMe = async (req, res) => sendSuccess(res, await usersService.getMe(req.user.id));
export const updateMe = async (req, res) => sendSuccess(res, await usersService.updateMe(req.user.id, req.body), 'Profile updated');
export const changePassword = async (req, res) => {
  await usersService.changePassword(req.user.id, req.body);
  sendSuccess(res, null, 'Password changed');
};

// Address book
export const listAddresses = async (req, res) => sendSuccess(res, await usersService.listAddresses(req.user.id));
export const addAddress = async (req, res) => sendCreated(res, await usersService.addAddress(req.user.id, req.body), 'Address saved');
export const updateAddress = async (req, res) => sendSuccess(res, await usersService.updateAddress(req.user.id, req.params.id, req.body), 'Address updated');
export const deleteAddress = async (req, res) => sendSuccess(res, await usersService.deleteAddress(req.user.id, req.params.id), 'Address deleted');
export const setDefaultAddress = async (req, res) => sendSuccess(res, await usersService.setDefaultAddress(req.user.id, req.params.id), 'Default address updated');