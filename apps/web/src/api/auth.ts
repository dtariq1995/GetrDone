import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from './client';

export type User = {
  id: string;
  username: string;
  createdAt: string;
};

export type Credentials = {
  username: string;
  password: string;
};

const meKey = ['me'] as const;

// Who is logged in: a User, or null when logged out. Every auth decision in
// the UI (protected routes, the header) reads from this one query.
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<User | null> => {
      try {
        return await apiFetch<User>('/auth/me');
      } catch (error) {
        // 401 isn't a failure here, it just means "not logged in".
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) =>
      apiFetch<User>('/auth/login', { method: 'POST', body: credentials }),
    // The form shows the error itself, so skip the global toast.
    meta: { inlineError: true },
    // The response is the user, so store it directly instead of refetching.
    onSuccess: (user) => queryClient.setQueryData(meKey, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) =>
      apiFetch<User>('/auth/register', { method: 'POST', body: credentials }),
    meta: { inlineError: true },
    onSuccess: (user) => queryClient.setQueryData(meKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      // Setting `me` to null is what makes ProtectedRoute redirect to /login.
      queryClient.setQueryData(meKey, null);
      // Drop everything else cached for this user, so whoever logs in next on
      // this browser can't briefly see the previous user's data. (Not
      // queryClient.clear(): that would also delete the `me` query that
      // mounted components are subscribed to, and they'd never see the null.)
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== meKey[0],
      });
    },
  });
}
