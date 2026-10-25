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

# Size limits are checked before attempting to parse a patch.
dd if=/dev/zero of="$tmp/oversized.patch" bs=200001 count=1 status=none
expect_reject "oversized patch" "$tmp/oversized.patch"

cat > "$tmp/path-traversal.patch" <<'PATCH'
diff --git a/src/../README.md b/src/../README.md
--- a/src/../README.md
+++ b/src/../README.md
@@ -1 +1 @@
-# Project
+# Changed
PATCH
expect_reject "path traversal" "$tmp/path-traversal.patch"

cat > "$tmp/hidden-path.patch" <<'PATCH'
diff --git a/src/.env b/src/.env
new file mode 100644
--- /dev/null
+++ b/src/.env
@@ -0,0 +1 @@
+DUMMY=value
PATCH
expect_reject "hidden source path" "$tmp/hidden-path.patch"

cat > "$tmp/mode-change.patch" <<'PATCH'
diff --git a/src/App.tsx b/src/App.tsx
old mode 100644
new mode 100755
PATCH
expect_reject "file mode change" "$tmp/mode-change.patch"

cat > "$tmp/symlink.patch" <<'PATCH'
diff --git a/src/alias.ts b/src/alias.ts
new file mode 120000
--- /dev/null
+++ b/src/alias.ts
@@ -0,0 +1 @@
+../README.md
PATCH
expect_reject "symlink creation" "$tmp/symlink.patch"

# Keep each generated patch valid so the policy checks the explicit line/file bounds.
for i in $(seq 1 1001); do
  printf '// line-bound-%s\n' "$i" >> "$fixture/src/App.tsx"
done
git -C "$fixture" diff -- src/App.tsx > "$tmp/too-many-lines.patch"
git -C "$fixture" checkout -- .
expect_reject "more than 1000 changed lines" "$tmp/too-many-lines.patch"

for i in $(seq -w 1 13); do
  printf 'export const generated%s = %s;\n' "$i" "$i" > "$fixture/src/generated-$i.ts"
done
git -C "$fixture" add -N 'src/generated-*.ts'
git -C "$fixture" diff -- > "$tmp/too-many-files.patch"
git -C "$fixture" reset -q -- 'src/generated-*.ts'
rm -f "$fixture"/src/generated-*.ts
expect_reject "more than 12 changed files" "$tmp/too-many-files.patch"

: > "$tmp/empty.patch"
expect_reject "empty patch" "$tmp/empty.patch"

echo "All patch policy tests passed."
