import { useEffect, useState } from 'react';
import { HashRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header, MobileBar } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LangProvider } from './services/i18n';
import type { ReactNode } from 'react';
import { StoreProvider, useStore } from './services/store';
import { Home } from './pages/Home';
import { UploadEvaluate } from './pages/UploadEvaluate';
import { EvaluationResult } from './pages/EvaluationResult';
import { CallRecords } from './pages/CallRecords';
import { TeamPerformance } from './pages/TeamPerformance';
import { QAInsights } from './pages/QAInsights';
import { LearningHub } from './pages/LearningHub';
import { MyGrowth } from './pages/MyGrowth';
import { Settings } from './pages/Settings';
import { ReportExport } from './pages/ReportExport';
import { EmptyState } from './components/EmptyState';

const COLLAPSE_KEY = 'marcom-qa:sidebar-collapsed';
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

function Shell() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [expanded, setExpanded] = useState(false);
  const tabletQuery = '(min-width: 721px) and (max-width: 1180px)';
  const [isTablet, setIsTablet] = useState(() => window.matchMedia(tabletQuery).matches);
  useEffect(() => {
    const onResize = () => {
      const tablet = window.matchMedia(tabletQuery).matches;
      setIsTablet((prev) => {
        if (prev !== tablet) setExpanded(false);
        return tablet;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const toggle = () => {
    if (window.matchMedia(tabletQuery).matches) {
      setIsTablet(true);
      setExpanded((e) => !e);
      return;
    }
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      const typing = t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]');
      if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey || typing) return;
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { toastMessage } = useStore();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="app">
      <MobileBar onMenu={() => setOpen(true)} />
      <Sidebar
        open={open}
        collapsed={collapsed}
        expanded={expanded}
        isTablet={isTablet}
        onToggle={toggle}
        onNavigate={() => {
          setOpen(false);
          setExpanded(false);
        }}
      />
      <main className="main">
        <Header />
        <Outlet />
      </main>
      {toastMessage && (
        <div className="toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

/**
 * A door, not a lock. This is a prototype: the capability check runs in the
 * browser, so it shapes what each role is given, not what a determined person
 * could reach. Real separation needs sign-in and server-side filtering.
 */
function RequireCan({ can, children }: { can: keyof ReturnType<typeof useStore>['can']; children: ReactNode }) {
  const store = useStore();
  if (store.can[can]) return <>{children}</>;
  return (
    <div className="page card">
      <EmptyState
        title="Not part of your view"
        message="This section belongs to the QA / MARCOM console. Your own calls and progress are on the home page."
        action="🏠 My page"
        to="/"
      />
    </div>
  );
}

export function App() {
  return (
    <LangProvider>
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/calls/:id/report" element={<ReportExport />} />
          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/evaluate" element={<RequireCan can="canReview"><UploadEvaluate /></RequireCan>} />
            <Route path="/calls" element={<CallRecords />} />
            <Route path="/calls/:id" element={<EvaluationResult />} />
            <Route path="/team" element={<RequireCan can="canSeeTeam"><TeamPerformance /></RequireCan>} />
            <Route path="/team/:staffId" element={<RequireCan can="canSeeTeam"><MyGrowth /></RequireCan>} />
            <Route path="/insights" element={<RequireCan can="canSeeTeam"><QAInsights /></RequireCan>} />
            <Route path="/learn" element={<LearningHub />} />
            <Route path="/growth" element={<MyGrowth />} />
            <Route path="/settings" element={<RequireCan can="canSeeInternals"><Settings /></RequireCan>} />
            <Route path="*" element={<div className="page card"><EmptyState title="Page not found" message="This page wandered off. Let's head back." action="🏠 Go home" to="/" /></div>} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
    </LangProvider>
  );
}
