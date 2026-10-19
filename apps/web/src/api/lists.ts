import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { taskKeys } from './tasks';

export type List = {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
};

export type ListWithCount = List & { taskCount: number };

export const listsKey = ['lists'] as const;

export function useLists() {
  return useQuery({
    queryKey: listsKey,
    queryFn: () => apiFetch<ListWithCount[]>('/lists'),
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color: string }) =>
      apiFetch<List>('/lists', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listsKey }),
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      color?: string;
    }) => apiFetch<List>(`/lists/${id}`, { method: 'PATCH', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listsKey }),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/lists/${id}`, { method: 'DELETE' }),
    // Deleting a list deletes its tasks too, so task views need a refresh.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listsKey }),
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      ]),
  });
}
