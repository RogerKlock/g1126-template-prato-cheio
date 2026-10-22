# Evidência — proteção da `main`

- **Repositório:** https://github.com/RogerKlock/g1126-template-prato-cheio
- **Configurada em:** 2026-10-22
- **Onde ver:** Settings → Branches → regra da `main`

## Regras ativas

| Regra | Valor | Por quê |
|---|---|---|
| Exigir Pull Request antes do merge | sim | nada entra direto na `main` |
| Aprovações exigidas | 1 | revisão por outro integrante |
| Descartar aprovação quando chega commit novo | sim | a aprovação vale para o código que foi revisado |
| Exigir check de status | `build-e-testes` (job do `ci.yml`) | só integra com CI verde |
| Aplicar também a administradores | sim | o dono do repositório também não pula a regra |
| Permitir force push | não | o histórico citado nos diagramas (`<hash>`) não pode ser reescrito |
| Permitir apagar a branch | não | |
| Estratégias de merge permitidas | só *merge commit* (squash e rebase desligados) | preserva os hashes dos commits citados em `docs/diagramas/` |

## Como conferir (saída da API do GitHub)

```bash
gh api repos/RogerKlock/g1126-template-prato-cheio/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts,
         aprovacoes: .required_pull_request_reviews.required_approving_review_count,
         descarta_aprovacao_antiga: .required_pull_request_reviews.dismiss_stale_reviews,
         vale_para_admins: .enforce_admins.enabled,
         force_push: .allow_force_pushes.enabled,
         apagar: .allow_deletions.enabled}'
```

Saída em 2026-10-22:

```json
{"apagar":false,"aprovacoes":1,"checks":["build-e-testes"],"descarta_aprovacao_antiga":true,"force_push":false,"vale_para_admins":true}
```

## Prova de que a regra funciona
A tentativa de `git push origin main` direto é recusada pelo GitHub com
`protected branch hook declined`. Os PRs deste trabalho só puderam ser integrados
depois de aprovados por outro integrante e com o check `build-e-testes` verde
(ver aba *Pull requests → Closed*).
