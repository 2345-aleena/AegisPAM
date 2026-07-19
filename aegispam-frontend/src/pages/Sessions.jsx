import { useEffect, useMemo, useState } from "react";
import { Clock, ShieldOff } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { listSessions, revokeSession } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Card from "../components/Card";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Seal from "../components/Seal";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function Sessions() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const now = useNow();

  async function load() {
    setLoading(true);
    try {
      setSessions(await listSessions());
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

  async function handleRevoke(id) {
    setRevokingId(id);
    try {
      await revokeSession(id);
      push("Session revoked.", "success");
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setRevokingId(null);
    }
  }

  const enriched = useMemo(
    () =>
      sessions.map((s) => {
        const expires = new Date(s.expires_at);
        const stillActive = s.is_active && expires > now;
        return { ...s, stillActive, expires };
      }),
    [sessions, now]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-brown-800">Sessions</h1>
        <p className="text-sm text-ink-soft mt-1">
          Just-in-time access grants. Sessions expire automatically -- no cleanup job required.
        </p>
      </div>

      <Card padded={false}>
        {loading ? (
          <p className="text-sm text-ink-soft p-6">Loading sessions…</p>
        ) : enriched.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No sessions yet"
            description="Sessions appear automatically once an access request is approved."
          />
        ) : (
          <ul className="divide-y divide-olive-100">
            {enriched.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Seal state={s.stillActive ? "open" : "sealed"} size={26} />
                  <div className="min-w-0">
                    <p className="font-medium text-brown-800">
                      Access request #{s.access_request_id}
                      <span className="text-ink-soft font-normal"> · user #{s.user_id}</span>
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {s.stillActive
                        ? `Expires in ${formatDistanceToNowStrict(s.expires)}`
                        : s.ended_at
                        ? `Ended ${format(new Date(s.ended_at), "MMM d, HH:mm")}`
                        : "Expired"}
                    </p>
                    <p className="text-xs text-ink-soft/70">
                      Started {format(new Date(s.started_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>
                {hasRole("admin", "approver") && s.stillActive && (
                  <Button
                    variant="danger"
                    onClick={() => handleRevoke(s.id)}
                    loading={revokingId === s.id}
                    className="!px-3 shrink-0"
                  >
                    <ShieldOff size={15} /> Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
