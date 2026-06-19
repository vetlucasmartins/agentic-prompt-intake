# Agentic Prompt Intake Protocol

Um protocolo portátil para impedir que agentes de IA executem pedidos vagos, transcrições de áudio, narrações soltas ou prompts mal formulados antes de transformá-los em uma tarefa clara, verificável e executável.

A ideia central é simples: a pessoa pode falar naturalmente; o agente deve fazer a anamnese do pedido antes de agir.

## Contexto e motivação

Este repositório nasceu como uma resposta prática ao debate levantado pelo vídeo viral do Thiago Finch sobre o "mega brain" e a forma de falar naturalmente com a IA: descrever a ideia em voz alta, em fluxo de pensamento, e deixar o agente trabalhar.

A proposta aqui complementa essa ideia com uma etapa que costuma faltar. Falar naturalmente é ótimo para a pessoa, mas é justamente quando o agente mais erra: ele tende a executar imediatamente uma transcrição solta como se fosse uma tarefa pronta. O *intake* resolve isso fazendo a ponte entre a fala natural e a execução — o agente acolhe o áudio/linguagem natural, faz a anamnese, fecha as lacunas críticas e só então executa.

Em uma frase: **você fala como pensa; o agente clarifica antes de agir.**

![Demo: da fala solta ao brief executável](docs/demo.gif)

> Veja o passo a passo na [demo](docs/DEMO.md).

## Instalação em 1 comando

Não precisa saber mexer em `.claude/`, `.cursor/` ou `AGENTS.md`. Na pasta do seu projeto, rode:

```bash
npx agentic-prompt-intake
```

O instalador **detecta sua ferramenta** (Claude Code, Codex, GitHub Copilot, Cursor, Cline, Windsurf ou Aider), pergunta se a instalação é no **projeto atual** ou **global** (toda a máquina), e coloca os arquivos certos no lugar certo. Ele **nunca sobrescreve** o seu `CLAUDE.md`/`AGENTS.md` — apenas adiciona um bloco marcado e idempotente.

Enquanto a publicação no npm não sai, você já pode rodar direto do GitHub:

```bash
npx github:vetlucasmartins/agentic-prompt-intake
```

Modo não interativo (para scripts/CI):

```bash
npx agentic-prompt-intake --target claude,cursor --scope project --yes
npx agentic-prompt-intake --list      # lista todos os alvos
```

> Prefere instalar manualmente? Veja [Instalação rápida por plataforma](#instalação-rápida-por-plataforma) mais abaixo.

> ⚠️ **Instale em UM único escopo (global OU projeto, nunca os dois).** Se o
> protocolo estiver presente tanto no escopo global (`~/.claude`, `~/.codex`)
> quanto no do projeto, o agente carrega o bloco de intake **duas vezes por
> sessão** — desperdiçando tokens sem nenhum ganho. O instalador avisa quando
> detecta o protocolo já presente no outro escopo. Para um projeto específico,
> prefira o escopo de projeto; para todos os seus projetos, use o global —
> mas não os dois.
>
> Checagem manual (Claude Code):
> `grep -l intake-refiner:start ~/.claude/CLAUDE.md ./CLAUDE.md 2>/dev/null` —
> se aparecer nos dois, remova o bloco marcado de um deles.

A partir da **v0.3.0** o intake roda em **um único passo curto** (cost
discipline): sem raciocínio estendido, sem subagents, sem leitura de arquivos só
para classificar. A maioria das entradas resolve em `READY_TO_EXECUTE` /
`NEEDS_LIGHT_REFINEMENT` — o brief completo de `NEEDS_INTAKE` fica reservado para
o que é de fato ambíguo. Assim o intake custa uma fração da tarefa, nunca mais.

### Avaliar o comportamento (eval)

Os casos em `evals/intake-cases.jsonl` podem ser executados e pontuados pelo
runner `scripts/run_eval.mjs` (zero dependências, usa `https` nativo — funciona
em Node ≥ 16):

```bash
npm run eval:dry          # valida o jsonl + asserts estáticos, SEM rede (ideal p/ CI)
npm run eval              # executa os casos contra o modelo (precisa de API key)
```

Para a execução real, configure o provider por variáveis de ambiente:

```bash
export ANTHROPIC_API_KEY=sk-...           # ou INTAKE_EVAL_API_KEY
export INTAKE_EVAL_PROVIDER=anthropic     # default; também suporta "openai"
export INTAKE_EVAL_MODEL=claude-haiku-4-5-20251001
npm run eval
```

O runner faz **uma única chamada por caso** (sem tools, `temperature 0`,
`max_tokens` limitado), então "extended reasoning", "spawn subagents" e "ler
arquivos" são impossíveis por construção. Ele pontua classificação, número de
perguntas, itens `must_not_do`, cobertura de `must_ask_about`, presença de
suposições — e registra **tokens de entrada/saída** com um **teto de custo por
classe**, imprimindo uma tabela com PASS/FAIL por caso e um resumo (taxa de
acerto, custo médio e p95).

## O que este repositório entrega

Este repositório fornece uma camada de **intake conversacional** para agentes de IA. Ela detecta quando uma entrada não está pronta para execução, organiza a intenção do usuário, identifica lacunas críticas, faz perguntas objetivas e gera um brief/prompt refinado.

Ele foi desenhado para funcionar em múltiplas ferramentas, não apenas em Claude Code ou Codex.

## Arquitetura

```text
.
├── AGENTS.md                                      # Contrato principal para agentes compatíveis
├── CLAUDE.md                                      # Adaptador para Claude Code
├── GEMINI.md                                      # Adaptador genérico para agentes que leem GEMINI.md
├── CONVENTIONS.md                                # Convenções para Aider e ferramentas similares
├── .agents/skills/intake-refiner/SKILL.md         # Skill para Codex / padrão Agent Skills
├── .claude/skills/intake-refiner/SKILL.md         # Skill para Claude Code
├── .github/copilot-instructions.md                # Instruções de repositório para GitHub Copilot
├── .github/instructions/intake-refiner.instructions.md
├── .cursor/rules/intake-refiner.mdc               # Regra para Cursor
├── .clinerules/intake-refiner.md                  # Regra para Cline
├── .windsurfrules                                 # Regra para Windsurf
├── docs/INTAKE-PROTOCOL.md                        # Protocolo canônico detalhado
├── docs/PORTABILITY.md                            # Mapa de compatibilidade entre plataformas
├── docs/EXAMPLES.md                               # Exemplos de uso
├── prompts/system-intake.md                       # Prompt de sistema para agentes próprios / Custom GPT
├── prompts/intake-router.md                       # Roteador de decisão antes da execução
├── schemas/intake-router.schema.json              # Esquema JSON para classificar entradas
├── templates/intake-brief.md                      # Modelo de brief estruturado
├── templates/execution-prompt.md                  # Modelo de prompt final executável
├── evals/intake-cases.jsonl                       # Casos de teste para avaliar o comportamento
├── scripts/run_eval.mjs                           # Runner que executa e pontua os casos (custo incluso)
└── scripts/validate_structure.py                  # Validação simples da estrutura do repositório
```

## Quando o protocolo deve ser ativado

Ative o protocolo quando a entrada do usuário parecer qualquer uma destas situações:

- Transcrição de áudio, pensamento em voz alta ou narração longa.
- Pedido vago, ambíguo, emocional ou associativo.
- Prompt sem entregável claro.
- Pedido com lacunas sobre público, formato, contexto, restrições ou critério de sucesso.
- Solicitação em que executar imediatamente provavelmente produziria um resultado genérico, incorreto ou desalinhado com o projeto.

Não ative quando o usuário já forneceu uma tarefa clara, formato, contexto suficiente e critérios mínimos de sucesso.

## Instalação rápida por plataforma

### Codex

Use o `AGENTS.md` na raiz do repositório. Para a skill reutilizável, mantenha:

```text
.agents/skills/intake-refiner/SKILL.md
```

O agente deve ler o `AGENTS.md` como contrato geral e carregar a skill quando detectar uma entrada que precisa de refinamento.

### Claude Code

Mantenha estes arquivos:

```text
CLAUDE.md
.claude/skills/intake-refiner/SKILL.md
```

O `CLAUDE.md` define a regra persistente. A skill contém o procedimento detalhado.

### GitHub Copilot

Mantenha:

```text
.github/copilot-instructions.md
.github/instructions/intake-refiner.instructions.md
AGENTS.md
```

### Cursor

Mantenha:

```text
.cursor/rules/intake-refiner.mdc
AGENTS.md
```

### Cline

Mantenha:

```text
.clinerules/intake-refiner.md
AGENTS.md
```

### Windsurf

Mantenha:

```text
.windsurfrules
AGENTS.md
```

### Aider

Use:

```bash
aider --read AGENTS.md --read CONVENTIONS.md
```

ou configure o arquivo `.aider.conf.yml` incluído no repositório.

### Custom GPT, ChatGPT Project ou agente via API

Use:

```text
prompts/system-intake.md
prompts/intake-router.md
schemas/intake-router.schema.json
```

O desenho recomendado para API é:

```text
entrada do usuário -> intake router -> intake refiner -> executor principal
```

## Fluxo de resposta esperado

Quando o protocolo for acionado, o agente não deve executar imediatamente. Ele deve responder neste padrão:

```markdown
Entendi provisoriamente que você quer...

Brief estruturado:
- Objetivo:
- Entregável:
- Contexto:
- Público:
- Restrições:
- Critério de sucesso:

Lacunas críticas:
1. ...
2. ...

Perguntas para destravar:
1. ...
2. ...
3. ...

Enquanto você responde, a versão provisória do pedido seria:
> ...
```

Se a tarefa estiver quase clara, o agente pode explicitar as suposições e seguir. Se faltar uma informação estrutural, deve perguntar antes.

## Exemplo curto

Entrada do usuário:

```text
Falei um áudio meio bagunçado. Quero que a IA organize minha ideia sobre criar um produto, mas ainda não sei direito se é curso, ebook ou mentoria.
```

Saída esperada:

```markdown
Entendi que você quer transformar uma ideia inicial de produto em uma proposta mais clara, mas ainda não decidiu o formato.

Brief provisório:
- Objetivo: organizar uma ideia de produto digital.
- Entregável possível: mapa de decisão entre curso, ebook e mentoria.
- Lacuna principal: público, transformação prometida e formato preferido.

Perguntas:
1. Quem é o público principal?
2. Qual problema específico esse produto resolveria?
3. Você quer primeiro decidir o formato ou já construir uma oferta preliminar?
```

## Como se compara (prior art)

A ideia de "clarificar antes de executar" não é inédita — o que é raro é o empacotamento. Projetos próximos:

- [severity1/claude-code-prompt-improver](https://github.com/severity1/claude-code-prompt-improver) — melhora o prompt via hook, mas é só Claude Code e reescreve em vez de fazer perguntas.
- [linxaiolu/prompt-clarifier](https://github.com/linxaiolu/prompt-clarifier), [lbexplorer/PromptClarifier](https://github.com/lbexplorer/PromptClarifier) — transformam ideia vaga em prompt estruturado, mas são single-tool e sem tração.
- Refinadores como [JacobHuang91/prompt-refiner](https://github.com/JacobHuang91/prompt-refiner) reescrevem prompts, sem etapa de anamnese.

**O diferencial deste projeto** é a combinação: (1) **portátil** entre 7 ferramentas via `AGENTS.md` + adapters, (2) **anamnese** com brief, lacunas e router de decisão em vez de só reescrever, e (3) **instalação `npx` em 1 comando** pensada para quem não é dev.

## Princípios

1. A IA deve acolher a linguagem natural, mas não deve fingir que um pedido vago é uma tarefa pronta.
2. O agente deve clarificar antes de executar quando a ambiguidade afeta o resultado.
3. Perguntas devem ser poucas, específicas e hierarquizadas.
4. O agente deve declarar suposições em vez de escondê-las.
5. O resultado final deve ser uma tarefa operacional, não apenas um prompt “bonito”.

## Estado do projeto

Versão inicial: `0.1.0`.

Este repositório é deliberadamente simples. Ele contém regras, skills, prompts, modelos e um pequeno script de validação. Não requer dependências externas.

## Como contribuir

Leia `CONTRIBUTING.md`. Ao alterar o protocolo central, atualize também os adaptadores relevantes para evitar divergência entre ferramentas.

## Licença

MIT. Veja `LICENSE`.
