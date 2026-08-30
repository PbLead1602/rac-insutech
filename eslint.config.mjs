import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**"]),
  {
    rules: {
      // Hero assets crossfade dynamically; images are served from the app's own static folder.
      "@next/next/no-img-element": "off",
    },
  },
]);
