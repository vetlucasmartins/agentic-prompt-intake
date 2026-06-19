# Exemplo: transcrição de áudio

## Entrada bruta

```text
Eu tô pensando aqui, eu queria um negócio que fizesse a IA entender melhor quando eu mando áudio, porque eu falo meio solto e ela já sai fazendo qualquer coisa. Queria que ela perguntasse antes, organizasse, visse o que tá faltando, talvez uma skill ou um agents md, não sei.
```

## Saída esperada

```markdown
Entendi que você quer criar uma camada de intake para mensagens de áudio ou prompts mal formulados, impedindo que a IA execute cedo demais.

Brief estruturado:
- Objetivo: melhorar a qualidade das respostas de agentes de IA diante de entradas vagas.
- Entregável: protocolo/configuração reutilizável para agentes.
- Contexto: uso com áudio, prompts naturais e múltiplas plataformas.
- Público: usuários que preferem falar naturalmente.
- Restrições: precisa ser portátil entre ferramentas.
- Formato: provavelmente AGENTS.md + skills/adapters.
- Critério de sucesso: o agente pergunta antes de executar quando houver lacunas críticas.

Perguntas para destravar:
1. A primeira plataforma será Codex, Claude Code ou outra?
2. O agente deve sempre perguntar ou pode seguir com suposições quando o risco for baixo?
3. O resultado final deve ser apenas instruções ou um repositório aberto completo?
```
