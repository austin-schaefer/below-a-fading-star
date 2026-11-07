#!/usr/bin/env bash
# Serve the prototype on http://localhost:${1:-8123}
cd "$(dirname "$0")/.." && exec npx --yes http-server -p "${1:-8123}" -s -c-1 .
