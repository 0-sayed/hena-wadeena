#!/usr/bin/env bash

set -euo pipefail

base_ref="${1:-origin/main}"

if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
  echo "Base ref '$base_ref' is not available locally."
  exit 1
fi

changed_files="$(git diff --name-only "$base_ref"...HEAD)"

if [[ -z "$changed_files" ]]; then
  echo "No changed files relative to $base_ref."
  exit 0
fi

declare -A service_packages=(
  [identity]='@hena-wadeena/identity'
  [market]='@hena-wadeena/market'
  [guide-booking]='@hena-wadeena/guide-booking'
  [map]='@hena-wadeena/map'
)

services=(identity market guide-booking map)
schema_changed_services=()
exit_code=0

for service in "${services[@]}"; do
  if ! printf '%s\n' "$changed_files" | rg -q "^services/${service}/src/db/(schema/.*|schema\\.ts|enums\\.ts|relations\\.ts)$"; then
    continue
  fi

  schema_changed_services+=("$service")

  if ! printf '%s\n' "$changed_files" | rg -q "^services/${service}/drizzle/"; then
    echo "Schema changed for ${service}, but no committed migration files changed under services/${service}/drizzle/."
    exit_code=1
  fi
done

if [[ ${#schema_changed_services[@]} -eq 0 ]]; then
  echo "No Drizzle schema changes detected."
  exit 0
fi

for service in "${schema_changed_services[@]}"; do
  echo "Verifying generated migrations for ${service}"
  pnpm --filter "${service_packages[$service]}" run db:generate >/dev/null

  if ! git diff --quiet -- "services/${service}/drizzle"; then
    echo "Generated migrations for ${service} are out of date with the committed schema."
    git diff -- "services/${service}/drizzle"
    exit_code=1
  fi
done

exit "$exit_code"
