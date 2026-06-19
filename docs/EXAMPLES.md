# Examples

## Example 1: voice-like project idea

### User input

```text
Eu mandei um áudio meio bagunçado. Eu quero criar alguma coisa para organizar meus conteúdos, talvez um curso, talvez um ebook, não sei. A ideia é ajudar pais, mas ainda não tenho certeza do formato.
```

### Intake response

```markdown
Entendi provisoriamente que você quer transformar uma ideia inicial de produto educacional para pais em uma proposta mais clara.

Brief estruturado:
- Objetivo: organizar uma ideia de produto/conteúdo.
- Entregável: ainda indefinido; pode ser curso, ebook ou mentoria.
- Contexto: conteúdo voltado para pais.
- Público: pais, mas o perfil específico ainda não está definido.
- Restrições: não informadas.
- Formato: a decidir.
- Critério de sucesso: escolher uma direção coerente e executável.

Lacunas críticas:
1. O público específico ainda está amplo demais.
2. O formato do produto ainda não foi escolhido.
3. A transformação prometida ao público ainda não está explícita.

Perguntas para destravar:
1. Que tipo de pai/mãe você quer ajudar primeiro?
2. Qual problema concreto esse produto resolveria?
3. Você quer primeiro comparar formatos ou já construir uma oferta preliminar?

Versão provisória do pedido:
> Ajude-me a transformar uma ideia inicial de produto para pais em um brief estruturado, comparando possíveis formatos e identificando o público, problema, promessa e próximo passo.
```

## Example 2: vague coding task

### User input

```text
Arruma esse app, está meio ruim e queria deixar mais profissional.
```

### Intake response

```markdown
Entendi que você quer melhorar a qualidade do app, mas “mais profissional” pode significar interface, arquitetura, performance, acessibilidade, copy, testes ou deploy.

Perguntas essenciais:
1. O foco principal é visual, código/arquitetura, performance ou experiência do usuário?
2. Qual parte do app está mais problemática agora?
3. Existe algum padrão de referência que você quer seguir?

Enquanto isso, a tarefa provisória seria:
> Auditar o app para identificar melhorias de profissionalização, separando achados por UI, UX, código, performance e confiabilidade.
```

## Example 3: almost clear request

### User input

```text
Reescreva esse texto para LinkedIn, mantendo o tom profissional e reduzindo repetições.
```

### Expected behavior

This is `READY_TO_EXECUTE`. The agent should not run a full intake process. It should execute.

## Example 4: needs light refinement

### User input

```text
Transforma isso em um README melhor para GitHub. Quero que fique claro e usável.
```

### Expected behavior

This is `NEEDS_LIGHT_REFINEMENT`. The agent may state assumptions and proceed.

```markdown
Vou assumir que “melhor” significa mais clareza para instalação, uso, estrutura do projeto e contribuição. Sigo com essa direção.
```
