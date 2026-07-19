import { useEffect, useState } from "react";
import { ClipboardList, Plus, X, Check } from "lucide-react";
import { format } from "date-fns";
import {
  listAccessRequests,
  createAccessRequest,
  decideAccessRequest,
  listResources,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClasses } from "../components/FormField";
import EmptyState from "../components/EmptyState";
import { StatusBadge } from "../components/Badges";

export default function AccessRequests() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const [requests, setRequests] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ resource_id: "", justification: "", requested_duration_minutes: 60 });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [decidingId, setDecidingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [reqs, res] = await Promise.all([listAccessRequests(), listResources()]);
      setRequests(reqs);
      setResources(res);
      if (res.length && !form.resource_id) setForm((f) => ({ ...f, resource_id: res[0].id }));
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

  function validate() {
    const next = {};
    if (form.justification.trim().length < 10) {
      next.justification = "Explain why access is needed (at least 10 characters).";
    }
    const duration = Number(form.requested_duration_minutes);
    if (!duration || duration < 5 || duration > 480) {
      next.requested_duration_minutes = "Duration must be between 5 and 480 minutes.";
    }
    if (!form.resource_id) {
      next.resource_id = "Choose a resource.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createAccessRequest({
        ...form,
        resource_id: Number(form.resource_id),
        requested_duration_minutes: Number(form.requested_duration_minutes),
      });
      push("Access request submitted.", "success");
      setForm({ resource_id: resources[0]?.id || "", justification: "", requested_duration_minutes: 60 });
      setShowForm(false);
      load();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      push(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(id, status) {
    setDecidingId(id);
    try {
      await decideAccessRequest(id, status);
      push(`Request ${status}.`, status === "approved" ? "success" : "info");
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDecidingId(null);
    }
  }

  const resourceName = (id) => resources.find((r) => r.id === id)?.name || `Resource #${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brown-800">Access Requests</h1>
          <p className="text-sm text-ink-soft mt-1">
            {hasRole("admin", "approver")
              ? "Review and decide on every request across the organization."
              : "Request just-in-time access, scoped to a resource and a duration."}
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} disabled={resources.length === 0}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New request"}
        </Button>
      </div>

      {resources.length === 0 && !loading && (
        <Card className="text-sm text-ink-soft">No resources exist yet, so there's nothing to request access to.</Card>
      )}

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <FormField label="Resource" htmlFor="resource" error={errors.resource_id} required>
              <select
                id="resource"
                className={inputClasses(errors.resource_id)}
                value={form.resource_id}
                onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.resource_type})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Justification" htmlFor="justification" error={errors.justification} required hint="Be specific -- this becomes part of the audit trail.">
              <textarea
                id="justification"
                rows={3}
                className={inputClasses(errors.justification)}
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                placeholder="e.g. Investigating a production incident affecting checkout latency."
                required
              />
            </FormField>

            <FormField
              label="Duration (minutes)"
              htmlFor="duration"
              error={errors.requested_duration_minutes}
              required
              hint="Between 5 and 480 minutes (8 hours)."
            >
              <input
                id="duration"
                type="number"
                min={5}
                max={480}
                className={inputClasses(errors.requested_duration_minutes) + " max-w-[10rem]"}
                value={form.requested_duration_minutes}
                onChange={(e) => setForm({ ...form, requested_duration_minutes: e.target.value })}
                required
              />
            </FormField>

            <div>
              <Button type="submit" loading={submitting}>
                Submit request
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        {loading ? (
          <p className="text-sm text-ink-soft p-6">Loading requests…</p>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No access requests yet"
            description="Submit a request above to kick off the approval workflow."
          />
        ) : (
          <ul className="divide-y divide-olive-100">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-brown-800">{resourceName(r.resource_id)}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-ink-soft mt-1 max-w-lg">{r.justification}</p>
                  <p className="text-xs text-ink-soft/70 mt-1">
                    {r.requested_duration_minutes} min · requested {format(new Date(r.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
                {hasRole("admin", "approver") && r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      onClick={() => handleDecision(r.id, "denied")}
                      loading={decidingId === r.id}
                      className="!px-3"
                    >
                      <X size={15} /> Deny
                    </Button>
                    <Button
                      onClick={() => handleDecision(r.id, "approved")}
                      loading={decidingId === r.id}
                      className="!px-3"
                    >
                      <Check size={15} /> Approve
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
