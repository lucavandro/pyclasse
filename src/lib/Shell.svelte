<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  import Icon from "$lib/Icon.svelte";
  let { children }: { children: Snippet } = $props();
  let collapsed = $state(false),
    mobile = $state(false);
  const teacher = $derived(session.profile?.role === "teacher");
  const nav = $derived([
    ["/", "Home", "home"],
    ["/classes", "Classi", "classes"],
    ["/exercises", "Esercizi", "exercises"],
    ["/reports/valutazioni", "Report", "reports"],
    ...(teacher ? [["/monitor", "Monitoraggio", "monitor"]] : []),
    ["/code-now", "Code now", "code"],
    ["/settings", "Impostazioni", "settings"],
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
    onclick={() => (mobile = !mobile)}
    ><Icon name={mobile ? "close" : "menu"} size={22} /></button
  >
  <aside
    class:open={mobile}
    class:collapsed
    class="sidebar"
    aria-label="Menu applicazione"
  >
    <a class="logo" href="/"
      ><span class="logo-mark"
        ><img src="/favicon.svg" alt="" width="30" height="30" /></span
      ><span class="brand-copy"
        ><strong>PyClasse</strong><small>Python classroom</small></span
      ></a
    >
    <p class="nav-label">Workspace</p>
    <nav aria-label="Navigazione principale">
      {#each nav as item}<a
          href={item[0]}
          role="button"
          aria-label={item[1]}
          aria-current={page.url.pathname === item[0] ? "page" : undefined}
          title={collapsed ? item[1] : undefined}
          class:active={page.url.pathname === item[0] ||
            (item[0] !== "/" &&
              page.url.pathname.startsWith(
                item[0].split("/").slice(0, 2).join("/"),
              ))}
          onclick={() => (mobile = false)}
          ><span class="nav-icon"><Icon name={item[2] as any} /></span><span
            class="nav-text">{item[1]}</span
          ></a
        >{/each}
    </nav>
    <div class="account">
      <span class="avatar" aria-hidden="true"
        >{(session.profile?.full_name || session.profile?.email || "P")
          .charAt(0)
          .toUpperCase()}</span
      >
      <span class="account-copy"
        ><strong>{session.profile?.full_name || session.profile?.email}</strong
        ><small
          >{session.profile?.role === "teacher" ? "Docente" : "Studente"}</small
        ></span
      ><button
        aria-label="Esci dall'account"
        title="Esci"
        class="quiet"
        onclick={() => void logout()}><Icon name="logout" size={18} /></button
      >
    </div>
    <button
      class="collapse quiet"
      aria-label={collapsed ? "Espandi menu" : "Comprimi menu"}
      onclick={() => (collapsed = !collapsed)}
      ><Icon name="collapse" size={18} /><span>Comprimi</span></button
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
    padding-left: 272px;
    transition: padding-left var(--duration-normal) var(--easing-standard);
  }
  .sidebar {
    position: fixed;
    z-index: 20;
    inset: 0 auto 0 0;
    width: 272px;
    background: linear-gradient(180deg, #0d1a2b, #0a1525);
    border-right: var(--border);
    padding: 1.1rem 0.9rem;
    display: flex;
    flex-direction: column;
    transition:
      width var(--duration-normal),
      transform var(--duration-normal);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-foreground);
    text-decoration: none;
    padding: 0.2rem 0.35rem;
  }
  .logo-mark {
    display: grid;
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid rgb(104 196 255 / 18%);
    border-radius: 0.8rem;
    background: linear-gradient(
      145deg,
      rgb(46 158 255 / 18%),
      rgb(12 121 216 / 8%)
    );
  }
  .brand-copy {
    display: grid;
    min-width: 0;
    line-height: 1.15;
  }
  .brand-copy strong {
    font-size: 1.08rem;
  }
  .brand-copy small {
    margin-top: 0.2rem;
    font-size: 0.68rem;
    letter-spacing: 0.04em;
  }
  .nav-label {
    margin: 2rem 0.75rem 0.55rem;
    color: var(--color-subtle);
    font-size: 0.68rem;
    font-weight: 720;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }
  .sidebar nav {
    display: grid;
    gap: 0.3rem;
  }
  .sidebar nav a {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-height: 44px;
    color: var(--color-muted);
    text-decoration: none;
    padding: 0.65rem 0.75rem;
    border-radius: var(--radius-md);
  }
  .nav-icon {
    display: grid;
    flex: 0 0 24px;
    place-items: center;
  }
  .sidebar nav a:hover,
  .sidebar nav a.active {
    color: var(--color-foreground);
    background: rgb(46 158 255 / 10%);
  }
  .sidebar nav a.active {
    box-shadow: inset 3px 0 0 var(--color-primary);
  }
  .sidebar nav a.active .nav-icon {
    color: var(--color-primary-soft);
  }
  .account {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.35rem;
    border: var(--border);
    border-radius: var(--radius-lg);
    padding: 0.65rem;
    overflow: hidden;
    background: rgb(255 255 255 / 2%);
  }
  .avatar {
    display: grid;
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      var(--color-primary),
      var(--color-primary-strong)
    );
    color: #fff;
    font-weight: 750;
  }
  .account-copy {
    display: grid;
    min-width: 0;
    line-height: 1.2;
  }
  .account-copy strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.82rem;
  }
  .account-copy small {
    margin-top: 0.2rem;
    font-size: 0.7rem;
  }
  .account button {
    min-width: 36px;
    min-height: 36px;
    margin-left: auto;
    padding: 0;
  }
  .collapse {
    width: 100%;
    justify-content: flex-start;
    color: var(--color-muted);
  }
  .content {
    max-width: 1380px;
    margin: 0 auto;
    padding: clamp(1.25rem, 3.5vw, 3rem);
  }
  .sidebar-collapsed {
    padding-left: 82px;
  }
  .sidebar-collapsed .sidebar {
    width: 82px;
  }
  .sidebar-collapsed .brand-copy,
  .sidebar-collapsed .nav-text,
  .sidebar-collapsed .nav-label,
  .sidebar-collapsed .account-copy,
  .sidebar-collapsed .collapse span {
    display: none;
  }
  .sidebar-collapsed .logo,
  .sidebar-collapsed .sidebar nav a,
  .sidebar-collapsed .collapse {
    justify-content: center;
  }
  .sidebar-collapsed .sidebar nav a.active {
    box-shadow: inset 0 -2px 0 var(--color-primary);
  }
  .sidebar-collapsed .account {
    flex-direction: column;
    padding: 0.5rem 0.25rem;
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
      width: min(86vw, 292px);
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
      right: 0.85rem;
      top: 0.85rem;
      width: 44px;
      height: 44px;
      padding: 0;
      background: rgb(15 28 46 / 92%);
      backdrop-filter: blur(12px);
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
      padding: 4.75rem 1rem 2rem;
    }
    .sidebar-collapsed .brand-copy,
    .sidebar-collapsed .nav-text,
    .sidebar-collapsed .nav-label,
    .sidebar-collapsed .account-copy,
    .sidebar-collapsed .collapse span {
      display: initial;
    }
    .sidebar-collapsed .logo,
    .sidebar-collapsed .sidebar nav a,
    .sidebar-collapsed .collapse {
      justify-content: flex-start;
    }
    .sidebar-collapsed .account {
      flex-direction: row;
    }
  }
</style>
