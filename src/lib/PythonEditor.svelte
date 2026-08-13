<script lang="ts">
  import { onMount } from "svelte";
  let {
    value = $bindable(""),
    ariaLabel = "Editor Python",
    allowClipboard = false,
    onChange,
  }: {
    value?: string;
    ariaLabel?: string;
    allowClipboard?: boolean;
    onChange?: (value: string) => void;
  } = $props();
  let host: HTMLDivElement;
  let view: any;
  let applying = false;
  onMount(() => {
    let active = true;
    void Promise.all([
      import("@codemirror/state"),
      import("@codemirror/view"),
      import("@codemirror/commands"),
      import("@codemirror/lang-python"),
    ]).then(
      ([
        { EditorState },
        { EditorView, keymap, lineNumbers },
        { defaultKeymap, history, historyKeymap },
        { python },
      ]) => {
        if (!active) return;
        view = new EditorView({
          parent: host,
          state: EditorState.create({
            doc: value,
            extensions: [
              lineNumbers(),
              history(),
              python(),
              keymap.of([...defaultKeymap, ...historyKeymap]),
              EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
              EditorView.domEventHandlers({
                copy: (e) => {
                  if (!allowClipboard) e.preventDefault();
                },
                cut: (e) => {
                  if (!allowClipboard) e.preventDefault();
                },
                paste: (e) => {
                  if (!allowClipboard) e.preventDefault();
                },
              }),
              EditorView.updateListener.of((u: any) => {
                if (u.docChanged && !applying) {
                  value = u.state.doc.toString();
                  onChange?.(value);
                }
              }),
            ],
          }),
        });
      },
    );
    return () => {
      active = false;
      view?.destroy();
    };
  });
  $effect(() => {
    if (view && value !== view.state.doc.toString()) {
      applying = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
      applying = false;
    }
  });
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    min-height: 300px;
    background: #171821;
    border: var(--border);
    font-family: var(--font-code);
    font-size: 0.95rem;
    overflow: auto;
  }
  .editor :global(.cm-editor) {
    min-height: 300px;
  }
  .editor :global(.cm-scroller) {
    font-family: var(--font-code);
  }
  .editor :global(.cm-content) {
    padding: 1rem;
  }
  .editor :global(.cm-gutters) {
    background: #20222d;
    color: var(--color-muted);
    border: 0;
  }
  .editor :global(.cm-focused) {
    outline: none;
  }
</style>
