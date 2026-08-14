<script lang="ts">
  import { page } from "$app/state";
  import { session } from "$lib/session.svelte";
  import { m } from "$lib/paraglide/messages.js";
  const teacherLinks = $derived([
    ["/reports/valutazioni", m.reports_evaluations()],
    ["/reports/avanzamento", m.reports_progress()],
    ["/reports/classi", m.nav_classes()],
    ["/reports/alert", m.reports_alerts()],
  ]);
  const links = $derived(
    session.profile?.role === "teacher"
      ? teacherLinks
      : teacherLinks.slice(0, 1),
  );
</script>

<nav aria-label={m.reports_sections()}>
  <div class="tabs" role="tablist">
    {#each links as l}<a
        role="tab"
        aria-selected={page.url.pathname === l[0] ||
          page.url.pathname.startsWith(`${l[0]}/`)}
        class:active={page.url.pathname === l[0] ||
          page.url.pathname.startsWith(`${l[0]}/`)}
        href={l[0]}>{l[1]}</a
      >{/each}
  </div>
</nav>
