#!/bin/sh

set -e

CHROME_SANDBOX="/opt/AIProtal/chrome-sandbox"

if [ -f "$CHROME_SANDBOX" ]; then
  chown root:root "$CHROME_SANDBOX"
  chmod 4755 "$CHROME_SANDBOX"
fi

# Ensure upgraded package doesn't keep an old background process alive.
pkill -x aiprotal >/dev/null 2>&1 || true
