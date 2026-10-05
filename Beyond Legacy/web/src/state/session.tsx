// App session: direct workspace access with full offline & instant capabilities.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { analyseStore, type StoreAnalysis } from '../engine/analyze';
import { today } from '../engine/dates';
import { localRepository } from '../data/local';
import { type Repository, type Workspace } from '../data/repo';

export type Phase = 'loading' | 'signed-out' | 'needs-store' | 'ready' | 'error';

interface Session {
  phase: Phase;
  mode: 'cloud' | 'local';
  projectId: string | null;
  user: { uid: string; email: string; name: string } | null;
  repo: Repository;
  workspace: Workspace;
  analysis: StoreAnalysis;
  todayStr: string;
  updatedAt: number | null;
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

export function useWorkspace() {
  const s = useSession();
  return { ...s, workspace: s.workspace, analysis: s.analysis, repo: s.repo };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const repo = useMemo<Repository>(() => localRepository(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayStr, setToday] = useState(today());
  const [updatedAt, setUpdatedAt] = useState<number | null>(Date.now());

  useEffect(() => {
    const t = setInterval(() => setToday(today()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return repo.subscribe(
      (w) => {
        if (w) setWorkspace(w);
        setUpdatedAt(Date.now());
      },
      (m) => setError(m),
    );
  }, [repo]);

  const analysis = useMemo(() => (workspace ? analyseStore(workspace.products, workspace.settings, todayStr, workspace.actions) : null), [workspace, todayStr]);

  if (!workspace || !analysis) {
    return null;
  }

  const value: Session = {
    phase: 'ready',
    mode: 'local',
    projectId: 'beyond-legacy-app',
    user: { uid: 'manager-1', email: 'store@beyondlegacy.app', name: workspace.store.managerName || 'Store Manager' },
    repo,
    workspace,
    analysis,
    todayStr,
    updatedAt,
    error,
    async signIn() {},
    async signUp() {},
    async signInWithGoogle() {},
    async resetPassword() {},
    async signOut() {
      localStorage.clear();
      location.reload();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
