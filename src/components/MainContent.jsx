import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { SkeletonView } from './common/Skeleton';

// Each section's code is its own chunk, fetched only the first time you visit it in a
// session (the browser caches it after that) — instead of every section's code shipping
// up front in one bundle regardless of which one you actually open.
const Overview = lazy(() => import('./views/Overview'));
const Projects = lazy(() => import('./views/Projects'));
const Checklist = lazy(() => import('./views/Checklist'));
const Team = lazy(() => import('./views/Team'));
const Improvements = lazy(() => import('./views/Improvements'));
const Links = lazy(() => import('./views/Links'));
const Hygiene = lazy(() => import('./views/Hygiene'));
const Leave = lazy(() => import('./views/Leave'));
const Prereq = lazy(() => import('./views/Prereq'));
const Docs = lazy(() => import('./views/Docs'));

function MainContent({ view, param, data, updateData, ui, setUi, syncStatus }) {
  const [skelView, setSkelView] = useState(null); // the view being "loaded"
  const [showSkeleton, setShowSkeleton] = useState(false);
  const prevView = useRef(view);
  const timerRef = useRef(null);

  useEffect(() => {
    // On first mount or same view — no skeleton
    if (prevView.current === view) return;

    prevView.current = view;

    // Pre-req loads real data and shows its own skeleton; a second one would just flash
    if (view === 'prereq') { setShowSkeleton(false); return; }

    // Team/project/leave/etc. data all comes from the one shared hub blob (useHubData), loaded
    // once and kept in memory from then on — so once it has arrived (anything but the very
    // first 'loading'), switching back to an already-visited view has nothing left to wait for.
    // Flashing a skeleton here would be theater, not a real loading state, so skip it.
    // (A first visit to a view still shows one via the Suspense fallback below, while its
    // code chunk downloads — that one reflects real work.)
    if (syncStatus !== 'loading') { setShowSkeleton(false); return; }

    // First-ever load: the shared data hasn't arrived yet, so this skeleton is real.
    clearTimeout(timerRef.current);
    setSkelView(view);
    setShowSkeleton(true);

    timerRef.current = setTimeout(() => {
      setShowSkeleton(false);
    }, 500);

    return () => clearTimeout(timerRef.current);
  }, [view, syncStatus]);

  const renderView = () => {
    switch (view) {
      case 'overview':
        return <Overview data={data} />;
      case 'projects':
        return <Projects data={data} updateData={updateData} ui={ui} setUi={setUi} />;
      case 'checklist':
        return <Checklist data={data} updateData={updateData} ui={ui} setUi={setUi} />;
      case 'team':
        return <Team data={data} updateData={updateData} ui={ui} setUi={setUi} />;
      case 'improvements':
        return <Improvements data={data} updateData={updateData} />;
      case 'links':
        return <Links data={data} updateData={updateData} />;
      case 'hygiene':
        return <Hygiene data={data} updateData={updateData} ui={ui} setUi={setUi} />;
      case 'leave':
        return <Leave data={data} updateData={updateData} ui={ui} setUi={setUi} />;
      case 'prereq':
        return <Prereq data={data} updateData={updateData} param={param} />;
      case 'docs':
        return <Docs data={data} updateData={updateData} ui={ui} setUi={setUi} />;
      default:
        return <Overview data={data} />;
    }
  };

  return (
    <main id="main" tabIndex="-1">
      {showSkeleton
        ? <SkeletonView view={skelView} data={data} ui={ui} />
        : <Suspense fallback={<SkeletonView view={view} data={data} ui={ui} />}>{renderView()}</Suspense>}
    </main>
  );
}

export default MainContent;
