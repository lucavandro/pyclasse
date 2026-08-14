<script lang="ts">
  import { marked } from "marked";
  let { source }: { source: string } = $props();
  const escape = (text: string) =>
    text.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => escape(text);
  renderer.link = ({ href, title, tokens }) => {
    const text = renderer.parser.parseInline(tokens);
    let safe = "#";
    try {
      const u = new URL(href, location.origin);
      if (u.protocol === "https:" || u.origin === location.origin)
        safe = escape(u.href);
    } catch {
      safe = "#";
    }
    return `<a href="${safe}"${title ? ` title="${escape(title)}"` : ""} target="_blank" rel="noopener noreferrer">${text}</a>`;
  };
  const html = $derived(
    marked.parse(source, { renderer, breaks: true }) as string,
  );
</script>

<div class="markdown">{@html html}</div>

<style>
  .markdown :global(pre),
  .markdown :global(code) {
    font-family: var(--font-code);
  }
  .markdown :global(code) {
    background: var(--color-surface-subtle);
    padding: 0.12rem 0.3rem;
    border-radius: 0.3rem;
  }
  .markdown :global(pre) {
    overflow: auto;
    border: var(--border);
    background: var(--color-surface-subtle);
    padding: 1rem;
    border-radius: var(--radius-md);
  }
  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) {
    margin-top: 1.4em;
  }
</style>
