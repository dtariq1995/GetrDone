import { MutationCache, QueryClient } from '@tanstack/react-query';
import { showErrorToast } from '../lib/toast';

// Lets a mutation opt out of the global error toast (see below) by setting
// meta: { inlineError: true }. This tells TypeScript that field exists.
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { inlineError?: boolean };
  }
}

// One cache for all server data.
export const queryClient = new QueryClient({
  defaultOptions: {
    // A failed request is retried once (not the default three times) so
    // errors show up quickly.
    queries: { retry: 1 },
  },
  // Any failed change (create, update, delete...) shows an error toast, so no
  // component has to remember to handle errors. Forms that show their own
  // error message, like login, opt out.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.meta?.inlineError) {
        showErrorToast(error.message);
      }
    },
  }),
});
