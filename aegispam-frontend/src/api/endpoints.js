import client from "./client";

// ---------- Auth ----------
export const registerUser = (data) => client.post("/auth/register", data).then((r) => r.data);
export const login = (data) => client.post("/auth/login", data).then((r) => r.data);
export const verifyMfaLogin = (userId, code) =>
  client.post(`/auth/mfa/verify-login?user_id=${userId}`, { code }).then((r) => r.data);
export const getMe = () => client.get("/auth/me").then((r) => r.data);
export const mfaEnroll = () => client.post("/auth/mfa/enroll").then((r) => r.data);
export const mfaActivate = (code) => client.post("/auth/mfa/activate", { code }).then((r) => r.data);
export const breakGlass = (resourceId, reason) =>
  client.post(`/auth/break-glass/${resourceId}?reason=${encodeURIComponent(reason)}`).then((r) => r.data);
export const listUsers = () => client.get("/auth/users").then((r) => r.data);
export const updateUserRole = (userId, role) =>
  client.patch(`/auth/users/${userId}/role`, { role }).then((r) => r.data);

// ---------- Resources ----------
export const listResources = () => client.get("/resources/").then((r) => r.data);
export const createResource = (data) => client.post("/resources/", data).then((r) => r.data);
export const deleteResource = (id) => client.delete(`/resources/${id}`).then((r) => r.data);

// ---------- Access requests ----------
export const listAccessRequests = () => client.get("/access-requests/").then((r) => r.data);
export const createAccessRequest = (data) => client.post("/access-requests/", data).then((r) => r.data);
export const decideAccessRequest = (id, status) =>
  client.patch(`/access-requests/${id}/decision`, { status }).then((r) => r.data);

// ---------- Sessions ----------
export const listSessions = () => client.get("/sessions/").then((r) => r.data);
export const revokeSession = (id) => client.post(`/sessions/${id}/revoke`).then((r) => r.data);

// ---------- Secrets ----------
export const listSecrets = () => client.get("/secrets/").then((r) => r.data);
export const createSecret = (data) => client.post("/secrets/", data).then((r) => r.data);
export const revealSecret = (id) => client.get(`/secrets/${id}/reveal`).then((r) => r.data);
export const rotateSecret = (id) => client.post(`/secrets/${id}/rotate`).then((r) => r.data);
export const rotateAllDue = () => client.post("/secrets/rotate-due").then((r) => r.data);
export const getRotationHistory = (id) => client.get(`/secrets/${id}/rotation-history`).then((r) => r.data);

// ---------- Risk & Dashboard ----------
export const getMyRiskScore = () => client.get("/risk-score/me/current").then((r) => r.data);
export const getUserRiskScore = (userId) => client.get(`/risk-score/${userId}`).then((r) => r.data);
export const getDashboardSummary = () => client.get("/dashboard/summary").then((r) => r.data);
export const getRiskTrends = () => client.get("/dashboard/risk-trends").then((r) => r.data);

// ---------- Audit ----------
export const listAuditLogs = (params = {}) => client.get("/audit-logs/", { params }).then((r) => r.data);
