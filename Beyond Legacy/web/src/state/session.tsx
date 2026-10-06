// App session: which backend is in use, who is signed in, the live workspace and its analysis.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut, updateProfile, type User } from 'firebase/auth';
import { analyseStore, type StoreAnalysis } from '../engine/analyze';
import { today } from '../engine/dates';
import { cloudRepository } from '../data/cloud';
import { firebase, type FirebaseHandles } from '../data/firebase';
import { localRepository } from '../data/local';
import { friendlyError, type Repository, type Workspace } from '../data/repo';

export type Phase = 'loading' | 'signed-out' | 'needs-store' | 'ready' | 'error';

interface Session {
  phase: Phase;
  mode: 'cloud' | 'local' | null;
  projectId: string | null;
  user: { uid: string; email: string; name: string } | null;
  repo: Repository | null;
  workspace: Workspace | null;
  analysis: StoreAnalysis | null;
  todayStr: string;
  updatedAt: number | null; // when the workspace data last changed
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

/** The workspace inside the app shell (only rendered once phase === 'ready'). */
export function useWorkspace() {
  const s = useSession();
  if (!s.workspace || !s.analysis || !s.repo) throw new Error('Workspace not ready');
  return { ...s, workspace: s.workspace, analysis: s.analysis, repo: s.repo };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [fb, setFb] = useState<FirebaseHandles | null | undefined>(undefined);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [todayStr, setToday] = useState(today());
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const fbRef = useRef<FirebaseHandles | null>(null);

  useEffect(() => {
    firebase().then((h) => {
      fbRef.current = h;
      setFb(h);
    }, () => setFb(null));
    const t = setInterval(() => setToday(today()), 60_000); // the date rolls over at midnight while the app is open
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!fb) return;
    return onAuthStateChanged(fb.auth, (u) => setUser(u), (e) => setError(friendlyError(e)));
  }, [fb]);

  const repo = useMemo<Repository | null>(() => {
    if (fb === undefined) return null;
    if (fb === null || !user) return localRepository();
    return cloudRepository(fb.db, { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' });
  }, [fb, user]);

  useEffect(() => {
    setWorkspace(undefined);
    setError(null);
    if (!repo) return;
    return repo.subscribe(
      (w) => {
        setWorkspace(w);
        setUpdatedAt(Date.now());
      },
      (m) => setError(m),
    );
  }, [repo]);

  const analysis = useMemo(() => (workspace ? analyseStore(workspace.products, workspace.settings, todayStr, workspace.actions) : null), [workspace, todayStr]);

  const phase: Phase =
    error && !workspace ? 'error'
      : fb === undefined ? 'loading'
      : workspace === undefined ? 'loading'
      : workspace === null ? 'needs-store'
      : 'ready';

  const need = useCallback(() => {
    if (!fbRef.current) throw new Error('Sign-in is not available: no Firebase project is configured for this build.');
    return fbRef.current;
  }, []);

  const value: Session = {
    phase, mode: fb === undefined ? null : fb ? 'cloud' : 'local', projectId: fb?.projectId ?? null,
    user: user ? { uid: user.uid, email: user.email ?? '', name: user.displayName ?? '' } : null,
    repo, workspace: workspace ?? null, analysis, todayStr, updatedAt, error,
    async signIn(email, password) {
      await signInWithEmailAndPassword(need().auth, email.trim(), password);
    },
    async signUp(name, email, password) {
      const c = await createUserWithEmailAndPassword(need().auth, email.trim(), password);
      if (name.trim()) await updateProfile(c.user, { displayName: name.trim() });
      setUser(need().auth.currentUser);
    },
    async signInWithGoogle() {
      await signInWithPopup(need().auth, new GoogleAuthProvider());
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(need().auth, email.trim());
    },
    async signOut() {
      if (fbRef.current) await fbSignOut(fbRef.current.auth);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
