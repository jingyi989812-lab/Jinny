#!/bin/zsh
# Saves your Anthropic API key to .env.local (git-ignored, readable only by you).
# The key is typed hidden and is never printed.
cd "$(dirname "$0")/.." || exit 1
echo "Paste your Anthropic API key (starts with sk-ant-) and press Enter."
echo "(Nothing will appear as you paste — that's intentional.)"
read -rs KEY
echo
KEY="${KEY//[[:space:]]/}"
if [[ "$KEY" != sk-ant-* ]]; then
  echo "❌ That doesn't look like an Anthropic API key (should start with sk-ant-). Nothing was saved."
  exit 1
fi
touch .env.local && chmod 600 .env.local
grep -v '^ANTHROPIC_API_KEY=' .env.local > .env.local.tmp 2>/dev/null
echo "ANTHROPIC_API_KEY=$KEY" >> .env.local.tmp
mv .env.local.tmp .env.local && chmod 600 .env.local
unset KEY
echo "✅ Key saved to .env.local (ending …$(tail -c 5 .env.local | tr -d '\n'))."
echo "Go back to the app → Settings → Evaluation engine to test it."
