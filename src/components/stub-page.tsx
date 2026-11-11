import { EmptyState } from "@fusorb/facet-components";
import { PageHeader } from "@fusorb/facet-layout";

/**
 * StubPage - the placeholder every route renders until its real surface is
 * wired (hooks -> store -> SDK -> API). Deliberately minimal: the route's own
 * word plus a facet EmptyState, so the whole route map renders, navigates and
 * type-checks while implementation proceeds page by page.
 *
 * Replace a StubPage with the real facet components + hook wiring in phase F5;
 * do not hand-roll UI that a facet package already ships.
 */
export function StubPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <main className="p-6">
        <EmptyState
          title={title}
          description={description ?? "This surface is planned - wiring pending."}
        />
      </main>
    </>
  );
}
