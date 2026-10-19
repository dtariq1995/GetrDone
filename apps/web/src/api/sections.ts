import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { taskKeys } from './tasks';

export type Section = {
  id: string;
  listId: string;
  name: string;
  position: number;
};

const sectionsKey = (listId: string) => ['sections', listId] as const;

// A list's Kanban columns. Pass undefined (e.g. for an Inbox task) to skip
// the request.
export function useSections(listId: string | undefined) {
  return useQuery({
    queryKey: sectionsKey(listId ?? ''),
    queryFn: () => apiFetch<Section[]>(`/lists/${listId}/sections`),
    enabled: listId !== undefined,
  });
}

export function useCreateSection(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<Section>(`/lists/${listId}/sections`, {
        method: 'POST',
        body: { name },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sectionsKey(listId) }),
  });
}

export function useRenameSection(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch<Section>(`/sections/${id}`, { method: 'PATCH', body: { name } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sectionsKey(listId) }),
  });
}

export function useDeleteSection(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/sections/${id}`, { method: 'DELETE' }),
    // Its tasks move to "No section", so task data changes too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sectionsKey(listId) }),
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      ]),
  });
}
