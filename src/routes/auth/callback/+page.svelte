<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  onMount(() => void goto("/"));
</script>

<main class="loading-screen">
  <div class="spinner"></div>
  <p>Completamento accesso…</p>
</main>
