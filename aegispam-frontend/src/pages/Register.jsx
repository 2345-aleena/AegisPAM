import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/endpoints";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClasses } from "../components/FormField";
import Seal from "../components/Seal";
import { useToast } from "../context/ToastContext";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

function passwordChecks(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
  };
}

export default function Register() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = passwordChecks(form.password);
  const passwordValid = checks.length && checks.upper && checks.number;
  const usernameValid = form.username.length === 0 || USERNAME_RE.test(form.username);

  function validate() {
    const next = {};
    if (!USERNAME_RE.test(form.username)) {
      next.username = "3-32 characters: letters, numbers, underscores only.";
    }
    if (!passwordValid) {
      next.password = "Password must meet all requirements below.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(form);
      push("Account created. You can now sign in.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Seal state="sealed" size={44} />
          <h1 className="mt-3 font-display text-3xl text-brown-800">Create your account</h1>
          <p className="text-sm text-ink-soft mt-1 text-center">
            New accounts start as <span className="font-medium">requester</span> -- an admin can promote you later.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <FormField label="Username" htmlFor="username" error={errors.username} required>
              <input
                id="username"
                className={inputClasses(errors.username || !usernameValid)}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                required
              />
            </FormField>

            <FormField label="Email" htmlFor="email" error={errors.email} required>
              <input
                id="email"
                type="email"
                className={inputClasses(errors.email)}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
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
                autoComplete="new-password"
                required
              />
              <ul className="mt-1 space-y-0.5 text-xs">
                <li className={checks.length ? "text-success" : "text-ink-soft"}>• At least 8 characters</li>
                <li className={checks.upper ? "text-success" : "text-ink-soft"}>• One uppercase letter</li>
                <li className={checks.number ? "text-success" : "text-ink-soft"}>• One number</li>
              </ul>
            </FormField>

            {formError && <p className="text-sm text-danger" role="alert">{formError}</p>}

            <Button type="submit" loading={loading} className="w-full mt-1">
              Create account
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-ink-soft mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-olive-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
