#!/usr/bin/env bash
# Hook do Claude Code: impede mandar arquivos pra main pela API do GitHub (que pularia o revisor).
# O caminho certo é "git push", que passa pelo tools/hooks/pre-push.
entrada="$(cat)"
if echo "$entrada" | grep -qE '"(branch|base)" *: *"main"|merge_pull_request'; then
  echo "Bloqueado: mudanças pra main só por 'git push' (o revisor tools/revisor/revisar.mjs roda no pre-push). Se for merge de PR, rode antes: node tools/revisor/revisar.mjs" >&2
  exit 2
fi
exit 0
