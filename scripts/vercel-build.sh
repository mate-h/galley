#!/bin/sh
# Install a Typst binary when the build machine does not have one, then
# build the static page. Vercel runs this from the repository root.
set -eu
cd "$(dirname "$0")/.."

if ! command -v typst >/dev/null 2>&1; then
  version=0.15.1
  arch=$(uname -m)
  case "$arch" in
    x86_64) target=x86_64-unknown-linux-musl ;;
    aarch64 | arm64) target=aarch64-unknown-linux-musl ;;
    *)
      echo "No Typst build for $arch" >&2
      exit 1
      ;;
  esac
  mkdir -p .typst
  url="https://github.com/typst/typst/releases/download/v${version}/typst-${target}.tar.xz"
  curl -fsSL "$url" | tar -xJ -C .typst --strip-components=1
  export PATH="$PWD/.typst:$PATH"
fi

npm install --prefix site
npm run build --prefix site
