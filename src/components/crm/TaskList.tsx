import { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useTasks } from '../../hooks/useTasks';
import { formatDate, truncate } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TaskListProps {
  contactId?: string;
  showCompleted?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskList({ contactId, showCompleted: initialShowCompleted }: TaskListProps) {
  // Local toggle for showing completed tasks
  const [showCompleted, setShowCompleted] = useState(initialShowCompleted ?? false);

  const { tasks, loading, createTask, deleteTask, toggleComplete, refetch } =
    useTasks({
      filters: {
        contact_id: contactId,
        completed: showCompleted ? undefined : false,
      },
    });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Sorted tasks: uncompleted first, then by due_date ascending ----------

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Uncompleted first
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Then by due_date ascending (nulls last)
      if (a.due_date && b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  }, [tasks]);

  // -- Helpers --------------------------------------------------------------

  const today = new Date().toISOString().split('T')[0];

  function isOverdue(task: { due_date: string | null; completed: boolean }): boolean {
    if (!task.due_date || task.completed) return false;
    return task.due_date < today;
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setDueDate('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const result = await createTask({
        title: title.trim(),
        description: description || null,
        due_date: dueDate || null,
        contact_id: contactId ?? null,
      });
      if (result) {
        resetForm();
        setModalOpen(false);
        await refetch();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete(taskId: string, currentState: boolean) {
    await toggleComplete(taskId, currentState);
    await refetch();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const ok = await deleteTask(deleteId);
    if (ok) {
      setDeleteId(null);
      await refetch();
    }
  }

  // -- Loading state --------------------------------------------------------

  if (loading) {
    return (
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  // -- Render ---------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Tasks
        </h2>
        <div className="flex items-center gap-3">
          {/* Show completed toggle */}
          <label className="flex items-center gap-2 text-xs text-primary-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-primary-300 text-accent focus:ring-accent h-3.5 w-3.5"
            />
            Show completed
          </label>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Add Task
          </Button>
        </div>
      </div>

      {/* Content */}
      {sortedTasks.length === 0 ? (
        <EmptyState
          title="No tasks"
          description="Create tasks to track follow-ups and action items."
          icon={
            <svg
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      ) : (
        <ul className="divide-y divide-primary-100">
          {sortedTasks.map((task) => {
            const overdue = isOverdue(task);

            return (
              <li
                key={task.id}
                className="flex items-start gap-3 py-3 group"
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleComplete(task.id, task.completed)}
                  className="mt-0.5 rounded border-primary-300 text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                />

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        task.completed
                          ? 'text-primary-400 line-through'
                          : 'text-primary-800'
                      }`}
                    >
                      {task.title}
                    </p>
                    {overdue && (
                      <Badge variant="danger">Overdue</Badge>
                    )}
                  </div>

                  {/* Due date */}
                  {task.due_date && (
                    <p
                      className={`text-xs mt-0.5 ${
                        overdue ? 'text-red-600 font-medium' : 'text-primary-500'
                      }`}
                    >
                      Due: {formatDate(task.due_date)}
                    </p>
                  )}

                  {/* Description preview */}
                  {task.description && (
                    <p className="text-xs text-primary-400 mt-0.5">
                      {truncate(task.description, 100)}
                    </p>
                  )}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => setDeleteId(task.id)}
                  className="text-xs text-primary-400 opacity-0 group-hover:opacity-100 hover:text-danger transition-all flex-shrink-0"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Task"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            required
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details..."
          />

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
