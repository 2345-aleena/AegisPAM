import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Server, KeySquare, Clock, ClipboardList, AlertTriangle } from "lucide-react";
import { getDashboardSummary, getMyRiskScore } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import { RiskBadge } from "../components/Badges";
import Seal from "../components/Seal";

const RISK_COLORS = { Low: "var(--color-success)", Medium: "var(--color-warning)", High: "var(--color-danger)" };

function StatCard({ icon: Icon, label, value, tone = "olive" }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`rounded-lg p-3 ${tone === "danger" ? "bg-danger-soft" : "bg-olive-100"}`}>
        <Icon size={20} className={tone === "danger" ? "text-danger" : "text-olive-700"} />
      </div>
      <div>
        <p className="text-2xl font-display text-brown-800">{value}</p>
        <p className="text-xs text-ink-soft">{label}</p>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [summary, setSummary] = useState(null);
  const [myRisk, setMyRisk] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const tasks = [getMyRiskScore()];
        if (hasRole("admin", "approver")) tasks.push(getDashboardSummary());
        const [risk, dash] = await Promise.all(tasks);
        if (!cancelled) {
          setMyRisk(risk);
          if (dash) setSummary(dash);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [hasRole]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-brown-800">Welcome back, {user?.username}</h1>
        <p className="text-sm text-ink-soft mt-1">Here's what's happening across your vault right now.</p>
      </div>

      {error && (
        <Card className="border-danger/30 bg-danger-soft text-danger text-sm">{error}</Card>
      )}

      {myRisk && (
        <Card className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Seal state={myRisk.badge === "High" ? "pending" : "sealed"} size={30} />
            <div>
              <p className="text-sm font-medium text-brown-800">Your current risk score</p>
              <p className="text-xs text-ink-soft">Score: {myRisk.score} · rule-based, fully explainable</p>
            </div>
          </div>
          <RiskBadge badge={myRisk.badge} />
        </Card>
      )}

      {hasRole("admin", "approver") && summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ClipboardList} label="Pending requests" value={summary.pending_requests_count} />
            <StatCard icon={Clock} label="Active sessions" value={summary.active_sessions_count} />
            <StatCard icon={Server} label="Resources" value={summary.total_resources} />
            <StatCard icon={KeySquare} label="Secrets in vault" value={summary.total_secrets} />
          </div>

          {summary.high_risk_user_count > 0 && (
            <Card className="flex items-center gap-3 border-danger/30 bg-danger-soft">
              <AlertTriangle size={20} className="text-danger shrink-0" />
              <p className="text-sm text-danger">
                {summary.high_risk_user_count} user{summary.high_risk_user_count > 1 ? "s" : ""} currently flagged
                as <strong>High</strong> risk. Review the audit log or revoke active sessions if needed.
              </p>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <p className="text-sm font-medium text-brown-800 mb-4">Access requests, last 14 days</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={summary.requests_over_time}>
                  <CartesianGrid stroke="var(--color-olive-100)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-olive-100)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="count" stroke="var(--color-olive-700)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <p className="text-sm font-medium text-brown-800 mb-4">Risk breakdown, all users</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.risk_breakdown}>
                  <CartesianGrid stroke="var(--color-olive-100)" vertical={false} />
                  <XAxis dataKey="badge" tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-olive-100)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {summary.risk_breakdown.map((entry) => (
                      <Cell key={entry.badge} fill={RISK_COLORS[entry.badge]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      {loading && !summary && !myRisk && <p className="text-sm text-ink-soft">Loading dashboard…</p>}
    </div>
  );
}
