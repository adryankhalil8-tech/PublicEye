/**
 * Remotion CLI config (Studio, render, bundle, compositions).
 * Node.js APIs (@remotion/renderer) ignore this file — pass options directly.
 * All options: https://remotion.dev/docs/config
 */
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Provenance-tracked media lives in assets/ (see assets/README.md).
// staticFile("images/foo.jpg") resolves to assets/images/foo.jpg.
Config.setPublicDir("./assets");
Config.setEntryPoint("./src/remotion/index.ts");
