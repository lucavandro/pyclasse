<script lang="ts">
  let {
    name,
    size = 20,
  }: {
    name:
      | "home"
      | "classes"
      | "exercises"
      | "reports"
      | "monitor"
      | "code"
      | "settings"
      | "menu"
      | "close"
      | "collapse"
      | "logout";
    size?: number;
  } = $props();
</script>

<svg
  aria-hidden="true"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#if name === "home"}<path d="m3 11 9-8 9 8" /><path
      d="M5 10v10h14V10M9 20v-6h6v6"
    />
  {:else if name === "classes"}<path d="M4 5.5 12 2l8 3.5-8 3.5-8-3.5Z" /><path
      d="M6 8v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5V8M20 6v7"
    />
  {:else if name === "exercises"}<path
      d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8"
    /><path d="M14 3h7v7M10 14 21 3" />
  {:else if name === "reports"}<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  {:else if name === "monitor"}<rect
      x="3"
      y="4"
      width="18"
      height="13"
      rx="2"
    /><path d="m7 11 2-2 3 4 3-3 2 2M9 21h6M12 17v4" />
  {:else if name === "code"}<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
  {:else if name === "settings"}<circle cx="12" cy="12" r="3" /><path
      d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4V3a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.38.34.72.6 1 .28.25.63.39 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6.6Z"
    />
  {:else if name === "menu"}<path d="M4 7h16M4 12h16M4 17h16" />
  {:else if name === "close"}<path d="m6 6 12 12M18 6 6 18" />
  {:else if name === "collapse"}<path d="m14 7-5 5 5 5" />
  {:else if name === "logout"}<path
      d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
    />{/if}
</svg>
