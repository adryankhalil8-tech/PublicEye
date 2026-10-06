import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    ignores: ["node_modules/", "out/", "build/", ".claude/", ".agents/"],
  },
];
