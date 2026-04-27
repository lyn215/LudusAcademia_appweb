import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchAnalytics } from "./features/analytics/api";
import { login, logout, getSession, register } from "./features/auth/api";
import { createLinkCode } from "./features/codes/api";
import { fetchGroups, createGroup } from "./features/groups/api";
import { fetchHealth } from "./features/health/api";
import { downloadPdf } from "./features/reports/api";
import { subscribeErrors } from "./lib/errorBus";
import { formatCountdown, secondsUntil } from "./utils/time";

import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { CreateGroupPage } from "./pages/CreateGroupPage";
import { DashboardPage } from "./pages/DashboardPage";

import type { AnalyticsMetric, GrupoInfo } from "./types/contracts";

export default function App() {
  const queryClient = useQueryClient();

  // ── Global errors ─────────────────────────────────────────────────────────
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  useEffect(() => subscribeErrors((msg) => {
    setGlobalErrors((prev) => {
      if (prev.includes(msg)) return prev;
      return [...prev.slice(-2), msg];
    });
  }), []);
  const clearErrors = () => setGlobalErrors([]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => { setAuthError(""); sessionQuery.refetch(); },
    onError: (e: any) => setAuthError(e?.message ?? "Error al iniciar sesión"),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => { sessionQuery.refetch(); clearErrors(); },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuthError("");
      if (data.email_confirmation_required) {
        setEmailConfirmPending(true);
      } else {
        sessionQuery.refetch();
      }
    },
    onError: (e: any) => setAuthError(e?.message ?? "Error al registrarse"),
  });

  // ── Health ────────────────────────────────────────────────────────────────
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 45_000,
    retry: 1,
  });

  // ── Groups ────────────────────────────────────────────────────────────────
  const [groupError, setGroupError] = useState("");
  const groupsQuery = useQuery({
    queryKey: ["grupos"],
    queryFn: fetchGroups,
    enabled: !!sessionQuery.data?.authenticated,
    retry: 1,
  });

  // React Query v5: handle groupsQuery errors via useEffect
  useEffect(() => {
    if (groupsQuery.error) {
      setGroupError((groupsQuery.error as any)?.message ?? "Error cargando grupos");
    }
  }, [groupsQuery.error]);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName]       = useState("");
  const [newGroupSchool, setNewGroupSchool]   = useState("Escuela 5 de Mayo de 1862");

  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (data) => {
      setGroupError("");
      groupsQuery.refetch();
      setSelectedGroupId(data.id_grupo);
      setShowCreateGroup(false);
      setNewGroupName("");
    },
    onError: (e: any) => setGroupError(e?.message ?? "Error creando grupo"),
  });

  useEffect(() => {
    if (groupsQuery.data?.length && selectedGroupId === null) {
      setSelectedGroupId(groupsQuery.data[0].id_grupo);
    }
  }, [groupsQuery.data, selectedGroupId]);

  const selectedGroup: GrupoInfo | undefined = groupsQuery.data?.find(
    (g) => g.id_grupo === selectedGroupId,
  );

  // ── Codes ─────────────────────────────────────────────────────────────────
  const [horasValidez, setHorasValidez] = useState(24);
  const [codeError, setCodeError]       = useState("");

  const codeMutation = useMutation({
    mutationFn: createLinkCode,
    onError: (e: any) => setCodeError(e?.message ?? "Error generando código"),
    onSuccess: () => setCodeError(""),
  });

  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(v => v + 1), 1000); return () => clearInterval(t); }, []);

  const countdown = useMemo(() => {
    if (!codeMutation.data?.expira_el) return null;
    return secondsUntil(codeMutation.data.expira_el);
  }, [codeMutation.data, tick]);

  const countdownDisplay = useMemo(() => countdown !== null ? formatCountdown(countdown) : null, [countdown]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const [metrica, setMetrica]                   = useState<AnalyticsMetric>("progreso");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [analyticsError, setAnalyticsError]     = useState("");
  // UUIDs keyed by group id then by alias, so each group keeps its own UUIDs during the session
  const [uuidByAlias, setUuidByAlias] = useState<Record<number, Record<string, string>>>({});

  const analyticsQuery = useQuery({
    queryKey: ["analytics", selectedGroupId, metrica],
    queryFn:  () => fetchAnalytics(selectedGroupId!, metrica),
    enabled:  analyticsEnabled && selectedGroupId !== null,
    retry: 1,
  });

  // React Query v5: handle analyticsQuery error/success via useEffect
  useEffect(() => {
    if (analyticsQuery.error) {
      setAnalyticsError((analyticsQuery.error as any)?.message ?? "Error cargando analítica");
    } else {
      setAnalyticsError("");
    }
  }, [analyticsQuery.error]);

  // ── Reports ───────────────────────────────────────────────────────────────
  const [reportError, setReportError] = useState("");
  const reportMutation = useMutation({
    mutationFn: downloadPdf,
    onSuccess: (blob, uuid) => {
      setReportError("");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `reporte-${uuid}.pdf`; a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: any) => setReportError(e?.message ?? "Error descargando PDF"),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    loginMutation.mutate({ email: String(fd.get("email") || ""), password: String(fd.get("password") || "") });
  };

  const onRegister = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") || "");
    const pw2 = String(fd.get("password2") || "");
    if (pw !== pw2) { setAuthError("Las contraseñas no coinciden."); return; }
    registerMutation.mutate({ email: String(fd.get("email") || ""), password: pw });
  };

  const onCreateGroup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGroupError("");
    createGroupMutation.mutate({ nombre_grupo: newGroupName, nombre_escuela: newGroupSchool });
  };

  // Clear analytics state and cache when switching groups so stale data never leaks
  const onSelectGroup = (newGroupId: number) => {
    queryClient.removeQueries({ queryKey: ["analytics"] });
    setSelectedGroupId(newGroupId);
    setAnalyticsEnabled(false);
    setAnalyticsError("");
    codeMutation.reset();
  };

  // ── Render: loading session ───────────────────────────────────────────────
  if (sessionQuery.isLoading) {
    return (
      <div className="shell-center">
        <p style={{ color: "var(--muted)", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem" }}>
          iniciando...
        </p>
      </div>
    );
  }

  // ── Render: auth ──────────────────────────────────────────────────────────
  if (!sessionQuery.data?.authenticated) {
    return (
      <LoginPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authError={authError}
        setAuthError={setAuthError}
        emailConfirmPending={emailConfirmPending}
        setEmailConfirmPending={setEmailConfirmPending}
        loginMutation={loginMutation}
        registerMutation={registerMutation}
        onLogin={onLogin}
        onRegister={onRegister}
      />
    );
  }

  // ── Render: loading groups ────────────────────────────────────────────────
  if (groupsQuery.isLoading) {
    return (
      <div className="shell-center">
        <p style={{ color: "var(--muted)", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem" }}>
          cargando grupos...
        </p>
      </div>
    );
  }

  const noGroups = !groupsQuery.data || groupsQuery.data.length === 0;

  // ── Render: onboarding ────────────────────────────────────────────────────
  if (noGroups && !showCreateGroup) {
    return (
      <OnboardingPage
        groupError={groupError}
        setGroupError={setGroupError}
        setShowCreateGroup={setShowCreateGroup}
        logoutMutation={logoutMutation}
      />
    );
  }

  // ── Render: create group ──────────────────────────────────────────────────
  if (showCreateGroup) {
    return (
      <CreateGroupPage
        noGroups={noGroups}
        groupError={groupError}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        newGroupSchool={newGroupSchool}
        setNewGroupSchool={setNewGroupSchool}
        createGroupMutation={createGroupMutation}
        setGroupError={setGroupError}
        setShowCreateGroup={setShowCreateGroup}
        onSubmit={onCreateGroup}
      />
    );
  }

  // ── Render: dashboard ─────────────────────────────────────────────────────
  return (
    <DashboardPage
      sessionData={sessionQuery.data}
      globalErrors={globalErrors}
      clearErrors={clearErrors}
      healthQuery={healthQuery}
      groupsQuery={groupsQuery}
      selectedGroupId={selectedGroupId}
      onSelectGroup={onSelectGroup}
      setShowCreateGroup={setShowCreateGroup}
      setGroupError={setGroupError}
      selectedGroup={selectedGroup}
      codeMutation={codeMutation}
      horasValidez={horasValidez}
      setHorasValidez={setHorasValidez}
      codeError={codeError}
      countdown={countdown}
      countdownDisplay={countdownDisplay}
      analyticsQuery={analyticsQuery}
      analyticsEnabled={analyticsEnabled}
      setAnalyticsEnabled={setAnalyticsEnabled}
      metrica={metrica}
      setMetrica={setMetrica}
      uuidByAlias={uuidByAlias}
      setUuidByAlias={setUuidByAlias}
      analyticsError={analyticsError}
      reportMutation={reportMutation}
      reportError={reportError}
      logoutMutation={logoutMutation}
    />
  );
}
