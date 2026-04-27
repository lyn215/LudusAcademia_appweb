import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { login, logout, getSession, register } from "./features/auth/api";
import { fetchGroups, createGroup } from "./features/groups/api";
import { fetchHealth } from "./features/health/api";
import { subscribeErrors } from "./lib/errorBus";

import { Sidebar, type Page } from "./components/Sidebar";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { CreateGroupPage } from "./pages/CreateGroupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AlumnosPage } from "./pages/AlumnosPage";
import { VinculacionPage } from "./pages/VinculacionPage";
import { AnaliticaPage } from "./pages/AnaliticaPage";
import { BancoPreguntasPage } from "./pages/BancoPreguntasPage";

import type { GrupoInfo } from "./types/contracts";

export default function App() {
  const queryClient = useQueryClient();

  // ── Navigation ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

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
    onSuccess: () => { localStorage.removeItem("ludus_ultimo_codigo"); sessionQuery.refetch(); clearErrors(); },
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

  // ── Health (for dashboard stats tile) ────────────────────────────────────
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

  // UUIDs keyed by group then alias — shared across Alumnos and Analítica
  const [uuidByAlias, setUuidByAlias] =
    useState<Record<number, Record<string, string>>>({});

  // Switch groups: clear analytics cache so stale data never leaks
  const onSelectGroup = (newGroupId: number) => {
    queryClient.removeQueries({ queryKey: ["analytics"] });
    setSelectedGroupId(newGroupId);
  };

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

  // ── Render: loading session ───────────────────────────────────────────────
  if (sessionQuery.isLoading) {
    return (
      <div className="shell-center">
        <p style={{ color: "var(--forest-warm)", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem" }}>
          iniciando...
        </p>
      </div>
    );
  }

  // ── Render: auth (no sidebar) ─────────────────────────────────────────────
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
        <p style={{ color: "var(--forest-warm)", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem" }}>
          cargando grupos...
        </p>
      </div>
    );
  }

  const noGroups = !groupsQuery.data || groupsQuery.data.length === 0;

  // ── Render: onboarding (no sidebar) ──────────────────────────────────────
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

  // ── Render: create group (no sidebar) ────────────────────────────────────
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

  // ── Render: main app with sidebar ─────────────────────────────────────────
  const sharedGroupProps = {
    selectedGroupId,
    selectedGroup,
    groupsData:  groupsQuery.data,
    isFetching:  groupsQuery.isFetching,
    onSelectGroup,
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        userEmail={sessionQuery.data.user?.email}
        onLogout={() => logoutMutation.mutate()}
      />

      <main className="page-content fade-up">
        {currentPage === "dashboard" && (
          <DashboardPage
            sessionData={sessionQuery.data}
            healthQuery={healthQuery}
            groupsQuery={groupsQuery}
            selectedGroupId={selectedGroupId}
            selectedGroup={selectedGroup}
            onSelectGroup={onSelectGroup}
            setShowCreateGroup={setShowCreateGroup}
            setGroupError={setGroupError}
            globalErrors={globalErrors}
            clearErrors={clearErrors}
          />
        )}

        {currentPage === "alumnos" && (
          <AlumnosPage
            {...sharedGroupProps}
            uuidByAlias={uuidByAlias}
            setUuidByAlias={setUuidByAlias}
          />
        )}

        {currentPage === "vinculacion" && (
          <VinculacionPage {...sharedGroupProps} />
        )}

        {currentPage === "analitica" && (
          <AnaliticaPage
            {...sharedGroupProps}
            uuidByAlias={uuidByAlias}
            setUuidByAlias={setUuidByAlias}
          />
        )}

        {currentPage === "banco" && <BancoPreguntasPage />}
      </main>
    </div>
  );
}
