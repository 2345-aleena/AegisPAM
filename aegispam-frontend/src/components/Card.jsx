export default function Card({ children, className = "", padded = true }) {
  return (
    <div
      className={`bg-card border border-olive-100 rounded-xl shadow-[0_1px_2px_rgba(43,42,32,0.06)] ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
