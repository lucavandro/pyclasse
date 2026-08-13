<script lang="ts">
  import { page } from "$app/state";
  const links = [
    ["/reports/valutazioni", "Valutazioni"],
    ["/reports/avanzamento", "Avanzamento"],
    ["/reports/classi", "Classi"],
    ["/reports/alert", "Alert"],
  ];
</script>

<nav aria-label="Sezioni report" class="tabs">
  {#each links as l}<a
      role="button"
      class:active={page.url.pathname === l[0]}
      href={l[0]}>{l[1]}</a
    >{/each}
</nav>
