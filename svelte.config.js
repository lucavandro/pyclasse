import adapter from "@sveltejs/adapter-cloudflare";

export default {
  kit: {
    adapter: adapter(),
    alias: { $lib: "src/lib" },
    files: { assets: "public" },
  },
};
