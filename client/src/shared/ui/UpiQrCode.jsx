// client/src/shared/ui/UpiQrCode.jsx
import { QRCodeCanvas } from 'qrcode.react';
import { forwardRef } from 'react';

/** Renders a scannable UPI QR for a upi://pay link */
const UpiQrCode = forwardRef(function UpiQrCode({ value, size = 200 }, ref) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-3">
      <QRCodeCanvas ref={ref} value={value} size={size} level="M" marginSize={1} />
    </div>
  );
});

export default UpiQrCode;