import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { TaskRow, TaskInsert, TaskUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface TaskFilters {
  completed?: boolean;
  contact_id?: string;
  artwork_id?: string;
  gallery_id?: string;
  exhibition_id?: string;
  invoice_id?: string;
  overdue?: boolean; // due_date < today and not completed
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseTasksOptions {
  filters?: TaskFilters;
  page?: number;
  pageSize?: number;
}

export interface UseTasksReturn {
  tasks: TaskRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (data: TaskInsert) => Promise<TaskRow | null>;
  updateTask: (id: string, data: TaskUpdate) => Promise<TaskRow | null>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleComplete: (id: string, currentState: boolean) => Promise<TaskRow | null>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const { filters = {}, page = 1, pageSize = 50 } = options;

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Fetch tasks --------------------------------------------------------

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('tasks')
        .select('*');

      // Completed filter
      if (filters.completed !== undefined) {
        query = query.eq('completed', filters.completed);
      }

      // Contact filter
      if (filters.contact_id) {
        query = query.eq('contact_id', filters.contact_id);
      }

      // Artwork filter
      if (filters.artwork_id) {
        query = query.eq('artwork_id', filters.artwork_id);
      }

      // Entity filters
      if (filters.gallery_id) {
        query = query.eq('gallery_id', filters.gallery_id);
      }
      if (filters.exhibition_id) {
        query = query.eq('exhibition_id', filters.exhibition_id);
      }
      if (filters.invoice_id) {
        query = query.eq('invoice_id', filters.invoice_id);
      }

      // Overdue filter: due_date < today and not completed
      if (filters.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('due_date', today).eq('completed', false);
      }

      // Sorting – default: due_date asc (nulls last), then created_at desc
      if (filters.sortBy) {
        const sortOrder = filters.sortOrder || 'asc';
        query = query.order(filters.sortBy, { ascending: sortOrder === 'asc' });
      } else {
        query = query
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false });
      }

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTasks((data as TaskRow[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.completed, filters.contact_id, filters.artwork_id, filters.gallery_id, filters.exhibition_id, filters.invoice_id, filters.overdue, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ---- Create task --------------------------------------------------------

  const createTask = useCallback(
    async (data: TaskInsert): Promise<TaskRow | null> => {
      try {
        // Auto-set user_id from current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('tasks')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        // Optimistic: append to list immediately
        setTasks((prev) => [...prev, created as TaskRow]);
        toast({ title: 'Task created', description: `"${created.title}" has been added.`, variant: 'success' });

        return created as TaskRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create task';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Update task --------------------------------------------------------

  const updateTask = useCallback(
    async (id: string, data: TaskUpdate): Promise<TaskRow | null> => {
      // Optimistic: apply update immediately
      const previous = tasks;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } as TaskRow : t)));

      try {
        const { data: updated, error: updateError } = await supabase
          .from('tasks')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Replace with server-confirmed data
        setTasks((prev) => prev.map((t) => (t.id === id ? (updated as TaskRow) : t)));
        toast({ title: 'Task updated', description: `"${updated.title}" has been saved.`, variant: 'success' });

        return updated as TaskRow;
      } catch (err: unknown) {
        // Rollback on error
        setTasks(previous);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [tasks, toast],
  );

  // ---- Delete task --------------------------------------------------------

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      // Optimistic: remove from list immediately
      const previous = tasks;
      setTasks((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Task deleted', variant: 'success' });
        return true;
      } catch (err: unknown) {
        // Rollback on error
        setTasks(previous);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [tasks, toast],
  );

  // ---- Toggle complete ----------------------------------------------------

  const toggleComplete = useCallback(
    async (id: string, currentState: boolean): Promise<TaskRow | null> => {
      // Optimistic: toggle immediately
      const previous = tasks;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !currentState } as TaskRow : t)));

      try {
        const { data: updated, error: updateError } = await supabase
          .from('tasks')
          .update({ completed: !currentState })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        setTasks((prev) => prev.map((t) => (t.id === id ? (updated as TaskRow) : t)));
        toast({
          title: updated.completed ? 'Task completed' : 'Task reopened',
          description: `"${updated.title}" has been ${updated.completed ? 'completed' : 'reopened'}.`,
          variant: 'success',
        });

        return updated as TaskRow;
      } catch (err: unknown) {
        // Rollback on error
        setTasks(previous);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [tasks, toast],
  );

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
  };
}
