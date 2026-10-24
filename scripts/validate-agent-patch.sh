#!/usr/bin/env bash
# Validate an AI-generated unified diff before it can be considered for publication.
# This script never applies the patch and never executes changed project code.
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Usage: bash scripts/validate-agent-patch.sh <patch-file>" >&2
  exit 2
fi

patch_file="$1"
repo_root="${PATCH_REPO_ROOT:-$(git rev-parse --show-toplevel)}"
[[ -d "$repo_root/.git" || -f "$repo_root/.git" ]] || {
  echo "ERROR: PATCH_REPO_ROOT is not a Git working tree." >&2
  exit 2
}

bytes=$(wc -c < "$patch_file")
(( bytes <= 200000 )) || {
  echo "ERROR: patch exceeds 200 KB." >&2
  exit 1
}
grep -q '^diff --git ' "$patch_file" || {
  echo "ERROR: not a unified git diff." >&2
  exit 1
}
if grep -Eq '^(old mode|new mode|new file mode 120000|deleted file mode 120000|rename from|rename to|copy from|copy to|GIT binary patch|Binary files)' "$patch_file"; then
  echo "ERROR: mode changes, symlinks, renames, copies, and binary patches are not allowed." >&2
  exit 1
fi

numstat_file=$(mktemp)
trap 'rm -f "$numstat_file"' EXIT
git -C "$repo_root" apply --numstat "$patch_file" > "$numstat_file"

count=0
changed_lines=0
while IFS=$'\t' read -r added deleted path; do
  [[ -n "${path:-}" ]] || {
    echo "ERROR: could not parse a changed path." >&2
    exit 1
  }
  [[ "$added" =~ ^[0-9]+$ && "$deleted" =~ ^[0-9]+$ ]] || {
    echo "ERROR: binary or unparseable file changes are not allowed." >&2
    exit 1
  }
  [[ ! "$path" =~ [[:space:]] ]] || {
    echo "ERROR: whitespace in file paths is not allowed: $path" >&2
    exit 1
  }
  [[ "$path" != /* && "$path" != *"/."* ]] || {
    echo "ERROR: absolute or hidden paths are not allowed: $path" >&2
    exit 1
  }
  case "/$path/" in
    *"/../"*|*"//"*)
      echo "ERROR: path traversal or repeated separators are not allowed: $path" >&2
      exit 1
      ;;
  esac

  case "$path" in
    src/*)
      case "$path" in
        *.test.*|*.spec.*|*__tests__*)
          echo "ERROR: tests cannot be modified by this publisher: $path" >&2
          exit 1
          ;;
        *.ts|*.tsx|*.js|*.jsx|*.css|*.html|*.json|*.md)
          ;;
        *)
          echo "ERROR: file type is outside the allowed source scope: $path" >&2
          exit 1
          ;;
      esac
      ;;
    docs/*.md|README.md)
      ;;
    *)
      echo "ERROR: path is outside the allowlist (src/ source files, docs/*.md, README.md): $path" >&2
      exit 1
      ;;
  esac

  count=$((count + 1))
  changed_lines=$((changed_lines + added + deleted))
done < "$numstat_file"

(( count > 0 && count <= 12 )) || {
  echo "ERROR: patch must touch 1–12 files." >&2
  exit 1
}
(( changed_lines <= 1000 )) || {
  echo "ERROR: patch exceeds 1,000 changed lines." >&2
  exit 1
}

git -C "$repo_root" apply --check "$patch_file"
printf 'files=%s changed_lines=%s bytes=%s\n' "$count" "$changed_lines" "$bytes"
