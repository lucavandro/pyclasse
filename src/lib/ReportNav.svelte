<script lang="ts">
  import { page } from "$app/state";
  import { session } from "$lib/session.svelte";
  const teacherLinks = [
    ["/reports/valutazioni", "Valutazioni"],
    ["/reports/avanzamento", "Avanzamento"],
    ["/reports/classi", "Classi"],
    ["/reports/alert", "Alert"],
  ];
  const links = $derived(
    session.profile?.role === "teacher"
      ? teacherLinks
      : teacherLinks.slice(0, 1),
  );
</script>

<nav aria-label="Sezioni report">
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
