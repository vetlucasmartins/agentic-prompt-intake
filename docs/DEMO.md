# Demo: da fala solta ao brief executável

Esta página mostra, passo a passo, o que o protocolo faz na prática. A ideia é simples: você fala como pensa, e o agente clarifica antes de agir.

> Dica: para gravar sua própria demo em terminal, use [asciinema](https://asciinema.org) (`asciinema rec demo.cast`) e cole o link aqui. Para um GIF, exporte com [agg](https://github.com/asciinema/agg).

## Antes / Depois

### 1. Você fala (entrada de áudio transcrita)

```text
Eu tô pensando aqui, eu queria um negócio que fizesse a IA entender melhor
quando eu mando áudio, porque eu falo meio solto e ela já sai fazendo qualquer
coisa. Queria que ela perguntasse antes, organizasse, visse o que tá faltando,
talvez uma skill ou um agents md, não sei.
```

### 2. Sem o protocolo (comportamento padrão de um agente)

```text
Claro! Criei um arquivo AGENTS.md com instruções genéricas para o seu agente.
Aqui está...
```

> O agente executou cedo demais. Escolheu plataforma, formato e escopo por conta
> própria — provavelmente errado.

### 3. Com o protocolo de intake

```markdown
Entendi que você quer criar uma camada de intake para mensagens de áudio ou
prompts mal formulados, impedindo que a IA execute cedo demais.

Brief estruturado:
- Objetivo: melhorar a qualidade das respostas de agentes diante de entradas vagas.
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

> Agora o agente entendeu a intenção, explicitou as suposições e fez apenas as
> perguntas que realmente destravam a execução.

## O fluxo, em uma linha

```text
fala natural / áudio  ->  intake router  ->  intake refiner  ->  executor principal
                          (classifica)      (faz anamnese)      (só então age)
```

O `intake router` classifica a entrada em `READY_TO_EXECUTE`, `NEEDS_LIGHT_REFINEMENT`,
`NEEDS_INTAKE` ou `BLOCKED`. Só `READY_TO_EXECUTE` segue direto para a execução.

## Mais exemplos

- [`examples/audio-transcript.pt.md`](../examples/audio-transcript.pt.md) — transcrição de áudio.
- [`examples/poor-prompt.pt.md`](../examples/poor-prompt.pt.md) — prompt mal formulado.
- [`docs/EXAMPLES.md`](EXAMPLES.md) — casos adicionais.
