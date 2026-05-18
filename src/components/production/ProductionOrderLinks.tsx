import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedExhibition {
  linkId: string;
  exhibitionId: string;
  title: string;
  type: string | null;
  start_date: string | null;
}

interface LinkedProject {
  linkId: string;
  projectId: string;
  title: string;
  status: string;
}

interface ExhibitionOption {
  id: string;
  title: string;
  type: string | null;
  start_date: string | null;
}

interface ProjectOption {
  id: string;
  title: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProductionOrderLinksProps {
  productionOrderId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductionOrderLinks({ productionOrderId }: ProductionOrderLinksProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exhibitions, setExhibitions] = useState<LinkedExhibition[]>([]);
  const [projects, setProjects] = useState<LinkedProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [showExhibitionModal, setShowExhibitionModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const [exhibitionOptions, setExhibitionOptions] = useState<ExhibitionOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [linking, setLinking] = useState(false);

  // ---- Fetch linked items --------------------------------------------------

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    const [exhRes, projRes] = await Promise.all([
      supabase
        .from('exhibition_production_orders')
        .select('id, exhibition_id, exhibitions(title, type, start_date)')
        .eq('production_order_id', productionOrderId),
      supabase
        .from('project_production_orders')
        .select('id, project_id, projects(title, status)')
        .eq('production_order_id', productionOrderId),
    ]);

    setExhibitions(
      ((exhRes.data ?? []) as never[]).map((r: never) => ({
        linkId: (r as { id: string }).id,
        exhibitionId: (r as { exhibition_id: string }).exhibition_id,
        title: (r as { exhibitions: { title: string } }).exhibitions?.title ?? '—',
        type: (r as { exhibitions: { type: string | null } }).exhibitions?.type ?? null,
        start_date: (r as { exhibitions: { start_date: string | null } }).exhibitions?.start_date ?? null,
      })),
    );

    setProjects(
      ((projRes.data ?? []) as never[]).map((r: never) => ({
        linkId: (r as { id: string }).id,
        projectId: (r as { project_id: string }).project_id,
        title: (r as { projects: { title: string } }).projects?.title ?? '—',
        status: (r as { projects: { status: string } }).projects?.status ?? '',
      })),
    );

    setLoading(false);
  }, [productionOrderId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // ---- Open exhibition modal -----------------------------------------------

  async function openExhibitionModal() {
    setSearch('');
    setShowExhibitionModal(true);
    setOptionsLoading(true);
    const { data } = await supabase
      .from('exhibitions')
      .select('id, title, type, start_date')
      .order('start_date', { ascending: false });
    setExhibitionOptions((data ?? []) as ExhibitionOption[]);
    setOptionsLoading(false);
  }

  // ---- Open project modal --------------------------------------------------

  async function openProjectModal() {
    setSearch('');
    setShowProjectModal(true);
    setOptionsLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('id, title, status')
      .order('title', { ascending: true });
    setProjectOptions((data ?? []) as ProjectOption[]);
    setOptionsLoading(false);
  }

  // ---- Link exhibition -----------------------------------------------------

  async function handleLinkExhibition(exhibitionId: string) {
    setLinking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLinking(false); return; }

    // Check not already linked
    const already = exhibitions.some((e) => e.exhibitionId === exhibitionId);
    if (already) {
      toast({ title: 'Already linked', variant: 'error' });
      setLinking(false);
      return;
    }

    const { error } = await supabase
      .from('exhibition_production_orders')
      .insert({ exhibition_id: exhibitionId, production_order_id: productionOrderId, user_id: session.user.id } as never);

    if (error) {
      toast({ title: 'Failed to link exhibition', variant: 'error' });
    } else {
      toast({ title: 'Exhibition linked', variant: 'success' });
      setShowExhibitionModal(false);
      await fetchLinks();
    }
    setLinking(false);
  }

  // ---- Link project --------------------------------------------------------

  async function handleLinkProject(projectId: string) {
    setLinking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLinking(false); return; }

    const already = projects.some((p) => p.projectId === projectId);
    if (already) {
      toast({ title: 'Already linked', variant: 'error' });
      setLinking(false);
      return;
    }

    const { error } = await supabase
      .from('project_production_orders')
      .insert({ project_id: projectId, production_order_id: productionOrderId, user_id: session.user.id } as never);

    if (error) {
      toast({ title: 'Failed to link project', variant: 'error' });
    } else {
      toast({ title: 'Project linked', variant: 'success' });
      setShowProjectModal(false);
      await fetchLinks();
    }
    setLinking(false);
  }

  // ---- Unlink exhibition ---------------------------------------------------

  async function handleUnlinkExhibition(linkId: string) {
    const { error } = await supabase.from('exhibition_production_orders').delete().eq('id', linkId);
    if (error) {
      toast({ title: 'Failed to remove link', variant: 'error' });
    } else {
      setExhibitions((prev) => prev.filter((e) => e.linkId !== linkId));
    }
  }

  // ---- Unlink project ------------------------------------------------------

  async function handleUnlinkProject(linkId: string) {
    const { error } = await supabase.from('project_production_orders').delete().eq('id', linkId);
    if (error) {
      toast({ title: 'Failed to remove link', variant: 'error' });
    } else {
      setProjects((prev) => prev.filter((p) => p.linkId !== linkId));
    }
  }

  // ---- Filtered options ----------------------------------------------------

  const filteredExhibitions = exhibitionOptions.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredProjects = projectOptions.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  // ---- Render --------------------------------------------------------------

  const hasAny = exhibitions.length > 0 || projects.length > 0;

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Linked Exhibitions & Projects
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openExhibitionModal}>
            + Exhibition
          </Button>
          <Button variant="outline" size="sm" onClick={openProjectModal}>
            + Project
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><LoadingSpinner /></div>
      ) : !hasAny ? (
        <p className="text-sm text-primary-400">No exhibitions or projects linked yet.</p>
      ) : (
        <div className="space-y-4">
          {/* Exhibitions */}
          {exhibitions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary-400">
                Exhibitions
              </p>
              <div className="space-y-2">
                {exhibitions.map((ex) => (
                  <div
                    key={ex.linkId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-primary-100 bg-primary-50/40 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/exhibitions/${ex.exhibitionId}`)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate text-sm font-medium text-primary-900 hover:underline">
                        {ex.title}
                      </p>
                      {(ex.type || ex.start_date) && (
                        <p className="mt-0.5 text-xs text-primary-400">
                          {[ex.type, ex.start_date].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkExhibition(ex.linkId)}
                      className="flex-shrink-0 text-red-400 hover:text-red-600"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary-400">
                Projects
              </p>
              <div className="space-y-2">
                {projects.map((pr) => (
                  <div
                    key={pr.linkId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-primary-100 bg-primary-50/40 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${pr.projectId}`)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate text-sm font-medium text-primary-900 hover:underline">
                        {pr.title}
                      </p>
                      <p className="mt-0.5 text-xs text-primary-400">{pr.status}</p>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkProject(pr.linkId)}
                      className="flex-shrink-0 text-red-400 hover:text-red-600"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exhibition picker modal */}
      <Modal
        isOpen={showExhibitionModal}
        onClose={() => setShowExhibitionModal(false)}
        title="Link Exhibition"
        size="xl"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exhibitions…"
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            autoFocus
          />
          {optionsLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-primary-100">
              {filteredExhibitions.length === 0 ? (
                <li className="py-4 text-center text-sm text-primary-400">No exhibitions found.</li>
              ) : filteredExhibitions.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    disabled={linking || exhibitions.some((e) => e.exhibitionId === ex.id)}
                    onClick={() => handleLinkExhibition(ex.id)}
                    className="flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-primary-50 disabled:opacity-40"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary-900">{ex.title}</p>
                      {(ex.type || ex.start_date) && (
                        <p className="text-xs text-primary-400">
                          {[ex.type, ex.start_date].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {exhibitions.some((e) => e.exhibitionId === ex.id) && (
                      <span className="text-xs text-emerald-600">Linked</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Project picker modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="Link Project"
        size="xl"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            autoFocus
          />
          {optionsLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-primary-100">
              {filteredProjects.length === 0 ? (
                <li className="py-4 text-center text-sm text-primary-400">No projects found.</li>
              ) : filteredProjects.map((pr) => (
                <li key={pr.id}>
                  <button
                    type="button"
                    disabled={linking || projects.some((p) => p.projectId === pr.id)}
                    onClick={() => handleLinkProject(pr.id)}
                    className="flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-primary-50 disabled:opacity-40"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary-900">{pr.title}</p>
                      <p className="text-xs text-primary-400">{pr.status}</p>
                    </div>
                    {projects.some((p) => p.projectId === pr.id) && (
                      <span className="text-xs text-emerald-600">Linked</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </section>
  );
}
