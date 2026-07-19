import { useEffect, useState } from "react";
import { KeySquare, Plus, X, Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import {
  listSecrets,
  createSecret,
  revealSecret,
  rotateSecret,
  listResources,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClasses } from "../components/FormField";
import EmptyState from "../components/EmptyState";
import Seal from "../components/Seal";

const SECRET_TYPES = ["password", "ssh_key", "api_token", "certificate"];
const REVEAL_TIMEOUT_MS = 20000;

function SecretRow({ secret, resourceName, isAdmin, onRotated }) {
  const { push } = useToast();
  const [revealed, setRevealed] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(null), REVEAL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  async function handleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    try {
      const res = await revealSecret(secret.id);
      setRevealed(res.secret);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setRevealing(false);
    }
  }

  async function handleCopy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRotate() {
    setRotating(true);
    try {
      await rotateSecret(secret.id);
      push("Secret rotated. Old credential is now invalid.", "success");
      setRevealed(null);
      onRotated();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setRotating(false);
    }
  }

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <Seal state={revealed ? "open" : "sealed"} size={26} />
        <div className="min-w-0">
          <p className="font-medium text-brown-800">
            {resourceName} <span className="text-ink-soft font-normal">· {secret.secret_type}</span>
          </p>
          <p className="text-xs text-ink-soft mt-0.5">
            Rotates every {secret.rotation_interval_days}d · last rotated {format(new Date(secret.last_rotated_at), "MMM d, HH:mm")}
          </p>
          {revealed && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <code className="text-xs font-mono bg-olive-950 text-cream-soft px-2.5 py-1.5 rounded-md break-all">
                {revealed}
              </code>
              <button onClick={handleCopy} className="text-brown-600 hover:text-olive-700 p-1" aria-label="Copy secret">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <span className="text-[11px] text-ink-soft/70">auto-hides in 20s</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="secondary" onClick={handleReveal} loading={revealing} className="!px-3">
          {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          {revealed ? "Hide" : "Reveal"}
        </Button>
        {isAdmin && (
          <Button variant="ghost" onClick={handleRotate} loading={rotating} className="!px-3">
            <RefreshCw size={15} /> Rotate
          </Button>
        )}
      </div>
    </li>
  );
}

export default function SecretsVault() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const [secrets, setSecrets] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ resource_id: "", secret_type: SECRET_TYPES[0], secret_value: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([listSecrets(), listResources()]);
      setSecrets(s);
      setResources(r);
      if (r.length && !form.resource_id) setForm((f) => ({ ...f, resource_id: r[0].id }));
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
    if (!form.resource_id) next.resource_id = "Choose a resource.";
    if (!form.secret_value.trim()) next.secret_value = "Secret value cannot be empty.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createSecret({ ...form, resource_id: Number(form.resource_id) });
      push("Secret added to the vault, encrypted at rest.", "success");
      setForm({ resource_id: resources[0]?.id || "", secret_type: SECRET_TYPES[0], secret_value: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      push(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const resourceName = (id) => resources.find((r) => r.id === id)?.name || `Resource #${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brown-800">Secret Vault</h1>
          <p className="text-sm text-ink-soft mt-1">
            Encrypted at rest with Fernet. Plaintext is only ever returned to a caller holding an active session
            for the matching resource.
          </p>
        </div>
        {hasRole("admin") && (
          <Button onClick={() => setShowForm((s) => !s)} disabled={resources.length === 0}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Add secret"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <FormField label="Resource" htmlFor="s-resource" error={errors.resource_id} required>
              <select
                id="s-resource"
                className={inputClasses(errors.resource_id)}
                value={form.resource_id}
                onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Type" htmlFor="s-type" required>
              <select
                id="s-type"
                className={inputClasses(false)}
                value={form.secret_type}
                onChange={(e) => setForm({ ...form, secret_type: e.target.value })}
              >
                {SECRET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Secret value" htmlFor="s-value" error={errors.secret_value} required className="sm:col-span-2">
              <input
                id="s-value"
                type="password"
                className={inputClasses(errors.secret_value) + " font-mono"}
                value={form.secret_value}
                onChange={(e) => setForm({ ...form, secret_value: e.target.value })}
                placeholder="Will be encrypted before it touches the database"
                required
              />
            </FormField>
            <div className="sm:col-span-2">
              <Button type="submit" loading={submitting}>
                Save to vault
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        {loading ? (
          <p className="text-sm text-ink-soft p-6">Loading vault…</p>
        ) : secrets.length === 0 ? (
          <EmptyState
            icon={KeySquare}
            title="Vault is empty"
            description={
              hasRole("admin")
                ? "Add a credential above -- it's encrypted immediately and never stored in plaintext."
                : "No secrets have been added to the vault yet."
            }
          />
        ) : (
          <ul className="divide-y divide-olive-100">
            {secrets.map((s) => (
              <SecretRow
                key={s.id}
                secret={s}
                resourceName={resourceName(s.resource_id)}
                isAdmin={hasRole("admin")}
                onRotated={load}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
