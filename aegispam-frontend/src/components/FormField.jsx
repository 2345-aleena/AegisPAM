export default function FormField({
  label,
  error,
  hint,
  children,
  htmlFor,
  required = false,
  className = "",
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-brown-800">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function inputClasses(hasError) {
  return `w-full rounded-lg border bg-cream-soft px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60
    focus:outline-none focus:ring-2 focus:ring-olive-500/40 transition-shadow
    ${hasError ? "border-danger" : "border-brown-200 focus:border-olive-500"}`;
}
