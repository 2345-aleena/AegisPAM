import QRCodeSVG from "react-qr-code";

export default function QRCode({ value, size = 140 }) {
  return (
    <div className="bg-white p-3 rounded-lg border border-olive-100 shrink-0 w-fit">
      <QRCodeSVG value={value} size={size} fgColor="#2A2820" bgColor="#FFFFFF" />
    </div>
  );
}
