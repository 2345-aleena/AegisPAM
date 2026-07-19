import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, verifyMfaLogin } from "../api/endpoints";
import { normalizeError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClasses } from "../components/FormField";
import Seal from "../components/Seal";

export default function Login() {
  const navigate = useNavigate();
  const { applyToken } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
  const [mfaCode, setMfaCode] = useState("");
  const [mfaUserId, setMfaUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setLoading(true);
    try {
      const res = await login(form);
      if (res.mfa_required) {
        setMfaUserId(res.user_id);
      } else {
        await applyToken(res.access_token);
        navigate("/", { replace: true });
      }
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e) {
    e.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      const res = await verifyMfaLogin(mfaUserId, mfaCode);
      await applyToken(res.access_token);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Seal state={mfaUserId ? "pending" : "sealed"} size={44} />
          <h1 className="mt-3 font-display text-3xl text-brown-800">AegisPAM</h1>
          <p className="text-sm text-ink-soft mt-1">Privileged access, granted just in time.</p>
        </div>

        <Card>
          {!mfaUserId ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
              <FormField label="Username" htmlFor="username" error={errors.username} required>
                <input
                  id="username"
                  className={inputClasses(errors.username)}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="username"
                  required
                />
              </FormField>
              <FormField label="Password" htmlFor="password" error={errors.password} required>
                <input
                  id="password"
                  type="password"
                  className={inputClasses(errors.password)}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
              </FormField>

              {formError && <p className="text-sm text-danger" role="alert">{formError}</p>}

              <Button type="submit" loading={loading} className="w-full mt-1">
                Sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} className="flex flex-col gap-4" noValidate>
              <p className="text-sm text-ink-soft">Enter the 6-digit code from your authenticator app.</p>
              <FormField label="Authentication code" htmlFor="mfa">
                <input
                  id="mfa"
                  inputMode="numeric"
                  maxLength={6}
                  className={inputClasses(false) + " tracking-[0.5em] text-center font-mono text-lg"}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </FormField>
              {formError && <p className="text-sm text-danger" role="alert">{formError}</p>}
              <Button type="submit" loading={loading} disabled={mfaCode.length !== 6} className="w-full">
                Verify &amp; sign in
              </Button>
            </form>
          )}
        </Card>

        {!mfaUserId && (
          <p className="text-center text-sm text-ink-soft mt-6">
            New here?{" "}
            <Link to="/register" className="text-olive-700 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
