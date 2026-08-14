<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { m } from "$lib/paraglide/messages.js";
  onMount(() => void goto("/"));
</script>

<main class="loading-screen">
  <div class="spinner"></div>
  <p>{m.auth_completing()}</p>
</main>
