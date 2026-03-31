# PR #77 — fix(deploy): use docker to fix permissions instead of sudo

> Generated: 2026-03-31 | Branch: fix/deploy-permissions-v2 | Last updated: 2026-03-31 06:18

## Worth Fixing

- [x] Pin alpine image to specific tag for supply-chain consistency — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M532O-k -->
  > **.github/workflows/deploy.yml:108**
  >
  > <!-- metadata:{"confidence":8} -->
  > P2: Pin the `alpine` image to a specific tag (e.g., `alpine:3.21`) or a digest to match the supply-chain hardening applied to all the GitHub Actions in this workflow. Using the implicit `:latest` tag introduces a mutable dependency in the deploy pipeline.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At .github/workflows/deploy.yml, line 108:
  >
  > <comment>Pin the `alpine` image to a specific tag (e.g., `alpine:3.21`) or a digest to match the supply-chain hardening applied to all the GitHub Actions in this workflow. Using the implicit `:latest` tag introduces a mutable dependency in the deploy pipeline.</comment>
  >
  > <file context>
  > @@ -105,7 +105,7 @@ jobs:
  >
  >             echo "==> Fixing file permissions (containers may run as root)"
  > -            sudo chown -R "$(id -u):$(id -g)" .
  > +            docker run --rm -v "$(pwd):/fix-perms" alpine chown -R "$(id -u):$(id -g)" /fix-perms
  >
  >             echo "==> Resetting working tree"
  > </file context>
  > ```
  >
  > </details>
  >
  > ```suggestion
  >             docker run --rm -v "$(pwd):/fix-perms" alpine:3.21 chown -R "$(id -u):$(id -g)" /fix-perms
  > ```

## Not Worth Fixing

_None found._
