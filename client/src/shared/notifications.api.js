// client/src/shared/notifications.api.js
import api from './axiosInstance.js';

export const getNotifications = (params) => api.get('/notifications', { params });
/** { count, latest } — polled by the bell icon */
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');
/** → { id, unread } */
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
/** Clear all → { deleted, unread: 0 } */
export const clearAllNotifications = () => api.delete('/notifications');

/** Fired on window when a new notification arrives, so open pages (orders lists) can refresh themselves */
export const NOTIFICATION_EVENT = 'motordesk:notification';