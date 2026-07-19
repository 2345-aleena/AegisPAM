const variants = {
  primary: "bg-olive-700 text-cream-soft hover:bg-olive-900 disabled:bg-olive-300",
  secondary: "bg-transparent text-olive-900 border border-olive-700/40 hover:bg-olive-100",
  danger: "bg-danger text-cream-soft hover:opacity-90 disabled:opacity-50",
  ghost: "bg-transparent text-brown-600 hover:bg-brown-200/30",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  disabled = false,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
        transition-colors duration-150 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
