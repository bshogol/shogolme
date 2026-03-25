import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    <div className="max-w-4xl mx-auto px-6 py-24 text-df-text-dim text-[15px] animate-pulse">
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<PostList />} />
              <Route path="/post/:slug" element={<PostDetail />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/series/:slug" element={<SeriesDetail />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
        <CommandPalette />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
