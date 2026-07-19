import { useEffect, useState } from "react";
import { Server, Plus, Trash2, X } from "lucide-react";
import { listResources, createResource, deleteResource } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClasses } from "../components/FormField";
import EmptyState from "../components/EmptyState";

const RESOURCE_TYPES = ["Database", "Server", "Cloud Account", "Application", "Network Device", "Other"];

export default function Resources() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", resource_type: RESOURCE_TYPES[0] });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setResources(await listResources());
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setErrors({});
    if (form.name.trim().length < 2) {
      setErrors({ name: "Name must be at least 2 characters." });
      return;
    }
    setSubmitting(true);
    try {
      await createResource(form);
      push("Resource added.", "success");
      setForm({ name: "", description: "", resource_type: RESOURCE_TYPES[0] });
      setShowForm(false);
      load();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      push(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    try {
      await deleteResource(id);
      push("Resource removed.", "success");
      load();
    } catch (err) {
      push(err.message, "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brown-800">Resources</h1>
          <p className="text-sm text-ink-soft mt-1">Privileged targets that access can be requested against.</p>
        </div>
        {hasRole("admin") && (
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Add resource"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <FormField label="Name" htmlFor="r-name" error={errors.name} required>
              <input
                id="r-name"
                className={inputClasses(errors.name)}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Production Database"
                required
              />
            </FormField>
            <FormField label="Type" htmlFor="r-type" required>
              <select
                id="r-type"
                className={inputClasses(false)}
                value={form.resource_type}
                onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Description" htmlFor="r-desc" className="sm:col-span-2">
              <textarea
                id="r-desc"
                rows={2}
                className={inputClasses(false)}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this resource, and who typically needs it?"
              />
            </FormField>
            <div className="sm:col-span-2">
              <Button type="submit" loading={submitting}>
                Save resource
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        {loading ? (
          <p className="text-sm text-ink-soft p-6">Loading resources…</p>
        ) : resources.length === 0 ? (
          <EmptyState
            icon={Server}
            title="No resources yet"
            description={
              hasRole("admin")
                ? "Add your first privileged resource -- a database, server, or cloud account -- to start the access-request workflow."
                : "No resources have been registered yet. Check back soon."
            }
          />
        ) : (
          <ul className="divide-y divide-olive-100">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-brown-800 truncate">{r.name}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {r.resource_type}
                    {r.description ? ` · ${r.description}` : ""}
                  </p>
                </div>
                {hasRole("admin") && (
                  <button
                    onClick={() => handleDelete(r.id, r.name)}
                    className="text-brown-400 hover:text-danger p-2 shrink-0"
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
