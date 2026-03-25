import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/Layout';
import { CommandPalette } from './components/CommandPalette';

const PostList = lazy(() => import('./pages/PostList').then((m) => ({ default: m.PostList })));
const PostDetail = lazy(() => import('./pages/PostDetail').then((m) => ({ default: m.PostDetail })));
const Tags = lazy(() => import('./pages/Tags').then((m) => ({ default: m.Tags })));
const SeriesDetail = lazy(() => import('./pages/SeriesDetail').then((m) => ({ default: m.SeriesDetail })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="px-4 py-8 text-terminal-text-dim text-sm animate-pulse">
      <span className="text-terminal-yellow">⟳</span> Loading...
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
      >
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route element={<Layout />}>
              <Route path="/" element={<PostList />} />
              <Route path="/post/:slug" element={<PostDetail />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/series/:slug" element={<SeriesDetail />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
        <CommandPalette />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
