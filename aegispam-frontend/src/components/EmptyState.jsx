export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-4">
      {Icon && (
        <div className="rounded-full bg-olive-100 p-3">
          <Icon size={22} className="text-olive-700" />
        </div>
      )}
      <div>
        <p className="font-display text-lg text-brown-800">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-soft max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
