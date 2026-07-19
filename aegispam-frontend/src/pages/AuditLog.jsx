import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";
import { listAuditLogs } from "../api/endpoints";
import { useToast } from "../context/ToastContext";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import { inputClasses } from "../components/FormField";

const ACTION_COLORS = {
  login_failed: "text-danger",
  break_glass: "text-danger",
  secret_revealed: "text-warning",
  request_denied: "text-danger",
  request_approved: "text-success",
  secret_rotated: "text-olive-700",
};

export default function AuditLog() {
  const { push } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  async function load(params = {}) {
    setLoading(true);
    try {
      setLogs(await listAuditLogs(params));
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(e) {
    const value = e.target.value;
    setActionFilter(value);
    load(value ? { action: value } : {});
  }

  const uniqueActions = Array.from(
    new Set(["login", "login_failed", "register", "request_created", "request_approved", "request_denied",
      "secret_created", "secret_revealed", "secret_rotated", "session_revoked", "session_expired", "break_glass",
      "mfa_enabled", "resource_created", "resource_deleted", "role_changed"])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brown-800">Audit Log</h1>
          <p className="text-sm text-ink-soft mt-1">
            Append-only record of every security-relevant action. Nothing here is ever edited or deleted.
          </p>
        </div>
        <select value={actionFilter} onChange={handleFilterChange} className={inputClasses(false) + " w-auto max-w-[14rem]"}>
          <option value="">All actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <Card padded={false}>
        {loading ? (
          <p className="text-sm text-ink-soft p-6">Loading audit trail…</p>
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No matching log entries" description="Try a different filter, or check back once activity occurs." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-olive-100 text-left text-xs text-ink-soft uppercase tracking-wide">
                  <th className="px-5 sm:px-6 py-3 font-medium">Time</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Actor</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Action</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Target</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 sm:px-6 py-3 whitespace-nowrap font-mono text-xs text-ink-soft">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="px-5 sm:px-6 py-3 whitespace-nowrap">{log.user_id ? `#${log.user_id}` : "—"}</td>
                    <td className={`px-5 sm:px-6 py-3 whitespace-nowrap font-medium ${ACTION_COLORS[log.action] || "text-brown-800"}`}>
                      {log.action.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 sm:px-6 py-3 whitespace-nowrap text-ink-soft">
                      {log.target_type ? `${log.target_type} #${log.target_id}` : "—"}
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-ink-soft max-w-xs truncate">{log.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
