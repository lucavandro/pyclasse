import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";

export default tseslint.config(
  {
    ignores: [
      ".svelte-kit/**",
      "dist/**",
      "public/vendor/**",
      "src/lib/paraglide/**",
      "supabase/.temp/**",
      "sources/**",
    ],
  },
  { ...js.configs.recommended, languageOptions: { globals: globals.browser } },
  ...tseslint.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
      globals: globals.browser,
    },
    rules: {
      "svelte/no-navigation-without-resolve": "off",
      "svelte/require-each-key": "off",
      "svelte/no-at-html-tags": "off",
      "svelte/prefer-svelte-reactivity": "off",
    },
  },
  {
    files: ["scripts/**", "tests/**", "*.config.*", "lib/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["public/*.js"],
    languageOptions: { globals: globals.worker },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
