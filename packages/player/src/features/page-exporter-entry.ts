/**
 * Entry for the IIFE build of the page exporter that the MCP App view injects into the page it
 * plays (see packages/cli/scripts/copy-view.js). Installs window.__helios_export.
 */
import { installPageExporter } from "./page-exporter";

installPageExporter(window);
