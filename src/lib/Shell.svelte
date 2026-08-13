<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  let { children }: { children: Snippet } = $props();
  let collapsed = $state(false),
    mobile = $state(false);
  const teacher = $derived(session.profile?.role === "teacher");
  const nav = $derived([
    ["/", "Home"],
    ["/classes", "Classi"],
    ["/exercises", "Esercizi"],
    ["/reports/valutazioni", "Report"],
    ...(teacher ? [["/monitor", "Monitoraggio"]] : []),
    ["/code-now", "Code now"],
    ["/settings", "Impostazioni"],
  ]);
  async function logout() {
    await supabase?.auth.signOut();
    await goto("/");
  }
</script>

<main class:sidebar-collapsed={collapsed} class="app-shell">
  <button
    class="mobile-toggle"
    aria-label={mobile ? "Chiudi menu" : "Apri menu"}
    onclick={() => (mobile = !mobile)}>{mobile ? "×" : "☰"}</button
  >
  <aside class:open={mobile} class:collapsed class="sidebar">
    <a class="logo" href="/"
      ><img src="/favicon.svg" alt="" width="34" height="34" /><strong
        >PyClasse</strong
      ></a
    >
    <nav aria-label="Navigazione principale">
      {#each nav as item}<a
          href={item[0]}
          role="button"
          class:active={page.url.pathname === item[0] ||
            (item[0] !== "/" &&
              page.url.pathname.startsWith(
                item[0].split("/").slice(0, 2).join("/"),
              ))}
          onclick={() => (mobile = false)}><span>{item[1]}</span></a
        >{/each}
    </nav>
    <div class="account">
      <small
        >{session.profile?.role === "teacher" ? "Docente" : "Studente"}</small
      ><strong>{session.profile?.full_name || session.profile?.email}</strong
      ><button
        aria-label="Esci dall'account"
        class="quiet"
        onclick={() => void logout()}>Esci</button
      >
    </div>
    <button
      class="collapse quiet"
      aria-label={collapsed ? "Espandi menu" : "Comprimi menu"}
      onclick={() => (collapsed = !collapsed)}
      >{collapsed ? "›" : "‹ Comprimi"}</button
    >
  </aside>
  {#if mobile}<button
      class="backdrop"
      aria-label="Chiudi sfondo menu"
      onclick={() => (mobile = false)}
    ></button>{/if}
  <section class="content">{@render children()}</section>
</main>

<style>
  .app-shell {
    min-height: 100vh;
    padding-left: 260px;
  }
  .sidebar {
    position: fixed;
    z-index: 20;
    inset: 0 auto 0 0;
    width: 260px;
    background: var(--color-surface);
    border-right: var(--border);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    transition:
      width var(--duration-normal),
      transform var(--duration-normal);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: var(--color-foreground);
    text-decoration: none;
    font-size: 1.15rem;
    padding: 0.4rem;
  }
  .sidebar nav {
    display: grid;
    gap: 0.35rem;
    margin-top: 2rem;
  }
  .sidebar nav a {
    color: var(--color-muted);
    text-decoration: none;
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }
  .sidebar nav a:hover,
  .sidebar nav a.active {
    color: var(--color-foreground);
    background: var(--color-surface-raised);
  }
  .account {
    margin-top: auto;
    display: grid;
    gap: 0.25rem;
    padding: 0.8rem;
    overflow: hidden;
  }
  .account strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .collapse {
    margin-top: 0.5rem;
  }
  .content {
    max-width: 1440px;
    margin: 0 auto;
    padding: clamp(1rem, 3vw, 2.5rem);
  }
  .sidebar-collapsed {
    padding-left: 84px;
  }
  .sidebar-collapsed .sidebar {
    width: 84px;
  }
  .sidebar-collapsed .sidebar strong,
  .sidebar-collapsed .sidebar nav span,
  .sidebar-collapsed .account,
  .sidebar-collapsed .collapse {
    font-size: 0;
  }
  .mobile-toggle,
  .backdrop {
    display: none;
  }
  @media (max-width: 800px) {
    .app-shell,
    .sidebar-collapsed {
      padding-left: 0;
    }
    .sidebar,
    .sidebar-collapsed .sidebar {
      width: 260px;
      transform: translateX(-105%);
      position: fixed;
    }
    .sidebar.open {
      transform: translateX(0);
    }
    .mobile-toggle {
      display: block;
      position: fixed;
      z-index: 25;
      right: 1rem;
      top: 1rem;
      width: 44px;
      height: 44px;
      padding: 0;
    }
    .backdrop {
      display: block;
      position: fixed;
      z-index: 15;
      inset: 0;
      border: 0;
      border-radius: 0;
      background: #0009;
    }
    .content {
      padding-top: 4.5rem;
    }
  }
</style>
