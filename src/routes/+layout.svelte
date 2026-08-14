<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import Auth from "$lib/Auth.svelte";
  import Shell from "$lib/Shell.svelte";
  import { initializeSession, session } from "$lib/session.svelte";
  import { m } from "$lib/paraglide/messages.js";
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
  ><title>{m.app_title()}</title><meta
    name="description"
    content={m.app_description()}
  /></svelte:head
>
{#if !session.ready}<main class="loading-screen">
    <div class="spinner"></div>
    <p>{m.common_loading()}</p>
  </main>
{:else if !session.user}<Auth />
{:else if !session.profile}<main class="loading-screen">
    <p class="error">{session.error || m.common_profile_unavailable()}</p>
  </main>
{:else}<Shell>{@render children()}</Shell>{/if}
