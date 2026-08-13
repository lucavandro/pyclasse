<script lang="ts">
  import { getReports } from "$lib/data";
  import { session } from "$lib/session.svelte";
  let loading = $state(true),
    error = $state(""),
    metrics = $state({ classes: 0, assignments: 0, submitted: 0, pending: 0 });
  $effect(() => {
    if (!session.profile) return;
    void (async () => {
      try {
        const [, classes, , , assignments, submissions] = await getReports();
        metrics = {
          classes: classes.length,
          assignments: assignments.length,
          submitted: submissions.filter((x) => x.status !== "draft").length,
          pending: submissions.filter((x) => x.status === "draft").length,
        };
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    })();
  });
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">PANORAMICA</p>
    <h1>Ciao, {session.profile?.full_name || session.profile?.email}</h1>
    <p>
      {session.profile?.role === "teacher"
        ? "Segui il lavoro della classe e prepara nuove attività."
        : "Continua il tuo percorso di apprendimento."}
    </p>
  </div>
</header>
{#if error}<p class="error">{error}</p>{:else if loading}<div
    class="spinner"
  ></div>{:else if session.profile?.role === "teacher"}<section class="panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">DATI DELLE CONSEGNE</p>
        <h2>Stato delle consegne</h2>
      </div>
    </div>
    <div class="metrics">
      <article>
        <strong>{metrics.classes}</strong><span>Classi attive</span>
      </article>
      <article>
        <strong>{metrics.assignments}</strong><span>Attività</span>
      </article>
      <article>
        <strong>{metrics.submitted}</strong><span>Consegnate</span>
      </article>
      <article>
        <strong>{metrics.pending}</strong><span>In lavorazione</span>
      </article>
    </div>
  </section>
{:else}<section class="panel">
    <h2>Il tuo spazio Python</h2>
    <p>
      Apri gli esercizi assegnati, esegui i test e consegna quando sei pronto.
    </p>
    <a class="button primary" href="/exercises">Vai agli esercizi</a>
  </section>{/if}

<style>
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  .metrics article {
    display: grid;
    gap: 0.2rem;
    padding: 1.2rem;
    background: var(--color-surface-raised);
    border-radius: var(--radius-md);
  }
  .metrics strong {
    font-size: 2rem;
    color: var(--color-cyan);
  }
</style>
