# caveman-compress

Compacta arquivos de memória e documentação em linguagem curta, preservando estrutura e conteúdo técnico.

## Uso

```text
/caveman-compress AGENTS.md
```

A skill aceita arquivos naturais como `.md`, `.txt`, `.typ`, `.typst` e `.tex`. Código, URLs, comandos, caminhos, headings e frontmatter são preservados.

## Runtime

- Usa o `codex exec` autenticado localmente.
- Executa em sessão efêmera, com sandbox `read-only` e sem carregar regras do projeto.
- Usa o modelo padrão do Codex; `CAVEMAN_MODEL` permite override opcional.
- Não usa SDK, chave ou executável de provedores legados.

## Segurança

- Recusa nomes de arquivos associados a credenciais, chaves, tokens e diretórios sensíveis.
- Envia o conteúdo somente depois dessa validação local.
- Cria e verifica um backup fora da árvore do projeto antes de substituir o arquivo.
- Restaura o original se a validação da saída falhar.

## Fluxo

1. Detectar se o arquivo contém linguagem natural compatível.
2. Separar e preservar o frontmatter.
3. Solicitar a compactação ao Codex.
4. Validar headings, URLs, código e estrutura.
5. Solicitar correções pontuais quando necessário.
6. Gravar somente após backup e validação.

Veja [SKILL.md](./SKILL.md) para o contrato da skill e [SECURITY.md](./SECURITY.md) para os limites de segurança.
