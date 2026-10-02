// server/src/billing/billing.controller.js
import { sendSuccess } from '../utils/ApiResponse.js';
import { buildOnlineWorkbook, buildWalkinWorkbook } from './billing.excel.js';
import * as billingService from './billing.service.js';

export const summary = async (req, res) => sendSuccess(res, await billingService.summary(req.vendorId, req.validQuery));

export const listWalkin = async (req, res) => {
  const { items, meta } = await billingService.listWalkin(req.vendorId, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};

export const listOnline = async (req, res) => {
  const { items, meta } = await billingService.listOnline(req.vendorId, req.validQuery);
  sendSuccess(res, items, 'OK', 200, meta);
};

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const stamp = ({ from, to }) => [from, to].filter(Boolean).join('_to_') || new Date().toISOString().slice(0, 10);

function sendWorkbook(res, buffer, filename) {
  res.set({
    'Content-Type': XLSX,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Content-Length': buffer.length,
  });
  res.send(Buffer.from(buffer));
}

export const exportWalkin = async (req, res) => {
  const data = await billingService.walkinForExport(req.vendorId, req.validQuery);
  sendWorkbook(res, await buildWalkinWorkbook(data), `Walkin-Bills_${stamp(req.validQuery)}.xlsx`);
};

export const exportOnline = async (req, res) => {
  const data = await billingService.onlineForExport(req.vendorId, req.validQuery);
  sendWorkbook(res, await buildOnlineWorkbook(data), `Online-Orders_${stamp(req.validQuery)}.xlsx`);
};