<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import Auth from "$lib/Auth.svelte";
  import Shell from "$lib/Shell.svelte";
  import { initializeSession, session } from "$lib/session.svelte";
  let { children } = $props();
  onMount(() => {
    let subscription: any;
    void initializeSession().then((x) => (subscription = x));
    if ("serviceWorker" in navigator && import.meta.env.PROD)
      void navigator.serviceWorker.register("/sw.js");
    return () => subscription?.data.subscription.unsubscribe();
  });
</script>

<svelte:head
  ><title>PyClasse — Impara Python, insieme</title><meta
    name="description"
    content="Classi, esercizi Python, correzione automatica e progressi in un solo spazio."
  /></svelte:head
>
{#if !session.ready}<main class="loading-screen">
    <div class="spinner"></div>
    <p>Caricamento…</p>
  </main>
{:else if !session.user}<Auth />
{:else if !session.profile}<main class="loading-screen">
    <p class="error">{session.error || "Profilo non disponibile."}</p>
  </main>
{:else}<Shell>{@render children()}</Shell>{/if}
