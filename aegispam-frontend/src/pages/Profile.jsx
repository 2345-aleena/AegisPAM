import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import QRCode from "../components/QRCode";
import { mfaEnroll, mfaActivate, listUsers, updateUserRole } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClasses } from "../components/FormField";
import { RoleBadge } from "../components/Badges";

function MfaSetup() {
  const { user, refreshUser } = useAuth();
  const { push } = useToast();
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    setLoading(true);
    try {
      setEnrollment(await mfaEnroll());
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await mfaActivate(code);
      push("MFA enabled on your account.", "success");
      setEnrollment(null);
      setCode("");
      refreshUser();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  if (user?.mfa_enabled) {
    return (
      <Card className="flex items-center gap-3">
        <ShieldCheck size={22} className="text-success shrink-0" />
        <div>
          <p className="text-sm font-medium text-brown-800">Multi-factor authentication is enabled</p>
          <p className="text-xs text-ink-soft mt-0.5">Every login now requires a code from your authenticator app.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm font-medium text-brown-800">Multi-factor authentication</p>
      <p className="text-xs text-ink-soft mt-1 mb-4">Add a second factor so a leaked password alone isn't enough to sign in.</p>

      {!enrollment ? (
        <Button onClick={handleEnroll} loading={loading}>
          Set up MFA
        </Button>
      ) : (
        <form onSubmit={handleActivate} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <QRCode value={enrollment.otpauth_uri} size={140} />
            <div className="text-xs text-ink-soft space-y-2">
              <p>Scan this with Google Authenticator, Authy, or any TOTP app.</p>
              <p>
                Can't scan? Enter this key manually:
                <br />
                <code className="font-mono text-brown-800 break-all">{enrollment.mfa_secret}</code>
              </p>
            </div>
          </div>
          <FormField label="Enter the 6-digit code to confirm" htmlFor="mfa-code">
            <input
              id="mfa-code"
              inputMode="numeric"
              maxLength={6}
              className={inputClasses(false) + " max-w-[10rem] font-mono tracking-widest"}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </FormField>
          <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-fit">
            Confirm &amp; enable
          </Button>
        </form>
      )}
    </Card>
  );
}

function UserManagement() {
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setUsers(await listUsers());
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

  async function handleRoleChange(userId, role) {
    setUpdatingId(userId);
    try {
      await updateUserRole(userId, role);
      push("Role updated.", "success");
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card padded={false}>
      <div className="flex items-center gap-2 px-5 sm:px-6 pt-5 sm:pt-6">
        <Users size={18} className="text-olive-700" />
        <p className="text-sm font-medium text-brown-800">User roles</p>
      </div>
      <p className="text-xs text-ink-soft px-5 sm:px-6 mt-1 mb-3">
        Self-registration always creates a requester. Promote trusted users to approver or admin here.
      </p>
      {loading ? (
        <p className="text-sm text-ink-soft px-6 pb-6">Loading users…</p>
      ) : (
        <ul className="divide-y divide-olive-100">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-brown-800 truncate">{u.username}</span>
                <RoleBadge role={u.role} />
              </div>
              <select
                value={u.role}
                disabled={updatingId === u.id}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className={inputClasses(false) + " w-auto text-xs py-1.5"}
              >
                <option value="requester">requester</option>
                <option value="approver">approver</option>
                <option value="admin">admin</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Profile() {
  const { user, hasRole } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-brown-800">Account</h1>
        <p className="text-sm text-ink-soft mt-1">
          Signed in as <span className="font-medium text-brown-800">{user?.username}</span> ({user?.email})
        </p>
      </div>

      <MfaSetup />
      {hasRole("admin") && <UserManagement />}
    </div>
  );
}
