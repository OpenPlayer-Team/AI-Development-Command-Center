#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
validator="$repo_root/scripts/validate-agent-patch.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fixture="$tmp/fixture"
mkdir -p "$fixture/src" "$fixture/docs" "$fixture/.github/workflows"

git -C "$fixture" init -q -b main
git -C "$fixture" config user.name "Patch policy test"
git -C "$fixture" config user.email "patch-policy-test@example.invalid"
printf 'export const app = "base";\n' > "$fixture/src/App.tsx"
printf 'export const appTest = "base";\n' > "$fixture/src/App.test.tsx"
printf '{"featureFlag":false}\n' > "$fixture/src/settings.json"
printf '# Docs\n' > "$fixture/docs/README.md"
printf '# Project\n' > "$fixture/README.md"
printf 'name: CI\n' > "$fixture/.github/workflows/ci.yml"
printf '{"name":"fixture"}\n' > "$fixture/package.json"
git -C "$fixture" add .
git -C "$fixture" commit -qm "fixture base"

make_patch() {
  local name="$1"
  local target="$2"
  printf '\n// candidate change\n' >> "$fixture/$target"
  git -C "$fixture" diff -- "$target" > "$tmp/$name.patch"
  git -C "$fixture" checkout -- .
}

expect_reject() {
  local name="$1"
  local patch="$2"
  if PATCH_REPO_ROOT="$fixture" bash "$validator" "$patch" > "$tmp/result.log" 2>&1; then
    echo "FAIL: validator unexpectedly accepted $name" >&2
    cat "$tmp/result.log" >&2
    exit 1
  fi
  echo "PASS: rejected $name"
}

make_patch allowed-src src/App.tsx
PATCH_REPO_ROOT="$fixture" bash "$validator" "$tmp/allowed-src.patch"

make_patch github-workflow .github/workflows/ci.yml
expect_reject "GitHub workflow modification" "$tmp/github-workflow.patch"

make_patch test-file src/App.test.tsx
expect_reject "test-file modification" "$tmp/test-file.patch"

make_patch source-json src/settings.json
expect_reject "source configuration JSON modification" "$tmp/source-json.patch"

make_patch package-manifest package.json
expect_reject "dependency manifest modification" "$tmp/package-manifest.patch"

make_patch documentation-text docs/README.md
PATCH_REPO_ROOT="$fixture" bash "$validator" "$tmp/documentation-text.patch"

echo "All patch policy tests passed."
