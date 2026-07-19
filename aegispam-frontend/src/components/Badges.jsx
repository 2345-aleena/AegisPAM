const riskStyles = {
  Low: "bg-success-soft text-success",
  Medium: "bg-warning-soft text-warning",
  High: "bg-danger-soft text-danger",
};

export function RiskBadge({ badge }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${riskStyles[badge] || riskStyles.Low}`}>
      {badge} risk
    </span>
  );
}

const statusStyles = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  denied: "bg-danger-soft text-danger",
  expired: "bg-brown-200/60 text-brown-800",
  active: "bg-success-soft text-success",
  inactive: "bg-brown-200/60 text-brown-800",
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status] || statusStyles.pending}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  const styles = {
    admin: "bg-brown-600 text-cream-soft",
    approver: "bg-olive-700 text-cream-soft",
    requester: "bg-olive-100 text-olive-900",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[role] || styles.requester}`}>
      {role}
    </span>
  );
}
