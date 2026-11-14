"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";
import { useProjects } from "@/hooks/use-projects";
import type { Project } from "@fusorb/facet-sdk";

export function ProjectsView() {
  const { activeTenant } = useTenant();
  const { list, create, remove } = useProjects();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    if (!activeTenant?.id) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await list(activeTenant.id);
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to load projects.");
      setItems(((res as any)?.data ?? []) as Project[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load projects."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeTenant?.id]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenant?.id || !name.trim()) return;
    setBusy("create"); setError(null);
    try {
      const res = await create(activeTenant.id, { name: name.trim(), description: description.trim() || undefined });
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to create project.");
      setName(""); setDescription(""); await load();
    } catch (e2) { setError(e2 instanceof Error ? e2.message : "Failed to create project."); }
    finally { setBusy(null); }
  }

  async function onDelete(id: string) {
    if (!activeTenant?.id) return;
    setBusy(id); setError(null);
    try { await remove(activeTenant.id, id); setItems((p) => p.filter((x) => x.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete project."); }
    finally { setBusy(null); }
  }

  if (!activeTenant) return (<><PageHeader title="Projects" description="Group resources under a project." /><main className="p-6 text-muted-foreground text-sm">Select an active workspace first.</main></>);

  return (
    <>
      <PageHeader title="Projects" description={`Projects in ${activeTenant.name}.`} actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <main className="p-6 space-y-4">
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Card><CardHeader><CardTitle>Create project</CardTitle></CardHeader><CardContent>
          <form className="grid gap-3 sm:grid-cols-3 sm:items-end" onSubmit={onCreate}>
            <div className="space-y-1"><Label htmlFor="pname">Name</Label><Input id="pname" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="pdesc">Description</Label><Input id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <Button type="submit" disabled={busy !== null || !name.trim()}>{busy === "create" ? "Creating…" : "Create"}</Button>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Projects</CardTitle></CardHeader><CardContent>
          {loading ? <Skeleton className="h-10 w-full" /> : items.length === 0 ? <EmptyState title="No projects" description="Create a project to group resources." /> : (
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {items.map((p) => (<TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.description || "—"}</TableCell><TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => void onDelete(p.id)} disabled={busy !== null}>{busy === p.id ? "Deleting…" : "Delete"}</Button></TableCell></TableRow>))}
            </TableBody></Table>
          )}
        </CardContent></Card>
      </main>
    </>
  );
}
