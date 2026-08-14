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
      import("@codemirror/language"),
      import("@lezer/highlight"),
    ]).then(
      ([
        { EditorState },
        { EditorView, keymap, lineNumbers },
        { defaultKeymap, history, historyKeymap },
        { python },
        { HighlightStyle, syntaxHighlighting },
        { tags },
      ]) => {
        if (!active) return;
        const pythonHighlightStyle = HighlightStyle.define([
          { tag: tags.keyword, color: "#68c4ff", fontWeight: "650" },
          { tag: [tags.name, tags.variableName], color: "#f4f8fc" },
          {
            tag: [
              tags.function(tags.variableName),
              tags.definition(tags.variableName),
            ],
            color: "#42d392",
          },
          { tag: [tags.string, tags.special(tags.string)], color: "#f8c85a" },
          { tag: [tags.number, tags.bool, tags.null], color: "#9dbdff" },
          {
            tag: [tags.comment, tags.docComment],
            color: "#7f93aa",
            fontStyle: "italic",
          },
          { tag: [tags.operator, tags.punctuation], color: "#a9b9ca" },
          { tag: [tags.className, tags.typeName], color: "#7ee6b7" },
          { tag: tags.invalid, color: "#ff6b7a", textDecoration: "underline" },
        ]);
        view = new EditorView({
          parent: host,
          state: EditorState.create({
            doc: value,
            extensions: [
              lineNumbers(),
              history(),
              python(),
              syntaxHighlighting(pythonHighlightStyle),
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
    background: var(--color-surface-subtle);
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
    background: #0e1b2d;
    color: var(--color-muted);
    border: 0;
  }
  .editor :global(.cm-focused) {
    outline: none;
  }
</style>
