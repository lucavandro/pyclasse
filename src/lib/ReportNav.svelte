<script lang="ts">
  import { page } from "$app/state";
  const links = [
    ["/reports/valutazioni", "Valutazioni"],
    ["/reports/avanzamento", "Avanzamento"],
    ["/reports/classi", "Classi"],
    ["/reports/alert", "Alert"],
  ];
</script>

<nav aria-label="Sezioni report">
  <div class="tabs" role="tablist">
    {#each links as l}<a
        role="tab"
        aria-selected={page.url.pathname === l[0]}
        class:active={page.url.pathname === l[0]}
        href={l[0]}>{l[1]}</a
      >{/each}
  </div>
</nav>
