// server/src/notifications/notifications.controller.js
import { sendSuccess } from '../utils/ApiResponse.js';
import * as service from './notifications.service.js';

export const list = async (req, res) => {
  const { items, meta } = await service.list(req.user.id, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};
export const unreadCount = async (req, res) => sendSuccess(res, await service.unreadSummary(req.user.id));
export const markRead = async (req, res) => sendSuccess(res, await service.markRead(req.user.id, req.params.id));
export const markAllRead = async (req, res) => sendSuccess(res, await service.markAllRead(req.user.id), 'All caught up');
export const remove = async (req, res) => sendSuccess(res, await service.remove(req.user.id, req.params.id), 'Notification deleted');
export const clearAll = async (req, res) => sendSuccess(res, await service.clearAll(req.user.id), 'All notifications cleared');