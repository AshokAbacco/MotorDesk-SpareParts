// server/src/marketplace/marketplace.controller.js
import { sendSuccess } from '../utils/ApiResponse.js';
import * as marketplaceService from './marketplace.service.js';

export const browse = async (req, res) => {
  const { items, meta } = await marketplaceService.browse(req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const productDetail = async (req, res) => sendSuccess(res, await marketplaceService.productDetail(req.params.id));
export const related = async (req, res) => sendSuccess(res, await marketplaceService.related(req.params.id));
export const validateCart = async (req, res) => sendSuccess(res, await marketplaceService.validateCart(req.body.items));