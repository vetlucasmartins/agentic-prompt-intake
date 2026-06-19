#!/usr/bin/env node
"use strict";
/*
 * agentic-prompt-intake installer.
 * Instala a camada de intake conversacional na ferramenta de IA do usuário.
 * Zero dependências: usa apenas módulos nativos do Node.
 *
 * Uso:
 *   npx agentic-prompt-intake                 # interativo
 *   npx agentic-prompt-intake --target claude,cursor --scope project --yes
 *   npx agentic-prompt-intake --list
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const PKG_ROOT = path.join(__dirname, "..");
const REPO_URL = "https://github.com/vetlucasmartins/agentic-prompt-intake";
const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, "package.json"), "utf8"));

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  green: "\x1b[32m", blue: "\x1b[34m", cyan: "\x1b[36m",
  yellow: "\x1b[33m", red: "\x1b[31m",
};
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (k, s) => (useColor ? C[k] + s + C.reset : s);

// Bloco marcado, idempotente, injetado em arquivos-contrato existentes.
const START = "<!-- intake-refiner:start -->";
const END = "<!-- intake-refiner:end -->";
function blockBody(skillRef) {
  const ref = skillRef ? `Procedimento detalhado: \`${skillRef}\`.` : "";
  return [
    START,
    "## Intake Protocol (agentic-prompt-intake)",
    "",
    "Antes de executar pedidos vagos, transcrições de áudio, narrações soltas",
    "ou prompts mal formulados, NÃO execute de imediato. Faça a anamnese:",
    "organize a intenção, aponte as lacunas críticas e faça poucas perguntas",
    "objetivas antes de agir. Declare suposições em vez de escondê-las.",
    ref,
    `Repositório: ${REPO_URL}`,
    END,
  ].filter(Boolean).join("\n");
}

// scope: "project" => base é o cwd; "global" => diretório de config da ferramenta.
// Cada alvo declara o layout por escopo. Arquivos de skill/regra são copiados
// (são namespaced, pertencem a este protocolo). Arquivos-contrato recebem o
// bloco marcado, sem nunca sobrescrever o conteúdo do usuário.
const TARGETS = {
  claude: {
    label: "Claude Code",
    detect: ["CLAUDE.md", ".claude"],
    project: {
      copies: [[".claude/skills/intake-refiner/SKILL.md", ".claude/skills/intake-refiner/SKILL.md"]],
      contract: "CLAUDE.md", skillRef: ".claude/skills/intake-refiner/SKILL.md",
    },
    global: {
      base: () => path.join(os.homedir(), ".claude"),
      copies: [[".claude/skills/intake-refiner/SKILL.md", "skills/intake-refiner/SKILL.md"]],
      contract: "CLAUDE.md", skillRef: "~/.claude/skills/intake-refiner/SKILL.md",
    },
  },
  codex: {
    label: "Codex / Agent Skills",
    detect: ["AGENTS.md", ".agents"],
    project: {
      copies: [[".agents/skills/intake-refiner/SKILL.md", ".agents/skills/intake-refiner/SKILL.md"]],
      contract: "AGENTS.md", skillRef: ".agents/skills/intake-refiner/SKILL.md",
    },
    global: {
      base: () => path.join(os.homedir(), ".codex"),
      copies: [[".agents/skills/intake-refiner/SKILL.md", "skills/intake-refiner/SKILL.md"]],
      contract: "AGENTS.md", skillRef: "~/.codex/skills/intake-refiner/SKILL.md",
    },
  },
  antigravity: {
    label: "Google Antigravity",
    // Antigravity nativamente lê AGENTS.md e o diretório .agents/ (mesmo padrão do Codex).
    detect: [".agents", "AGENTS.md", ".antigravity"],
    project: {
      copies: [[".agents/skills/intake-refiner/SKILL.md", ".agents/skills/intake-refiner/SKILL.md"]],
      contract: "AGENTS.md", skillRef: ".agents/skills/intake-refiner/SKILL.md",
    },
  },
  copilot: {
    label: "GitHub Copilot",
    detect: [".github/copilot-instructions.md"],
    project: {
      copies: [[".github/instructions/intake-refiner.instructions.md", ".github/instructions/intake-refiner.instructions.md"]],
      contract: ".github/copilot-instructions.md", skillRef: ".github/instructions/intake-refiner.instructions.md",
    },
  },
  cursor: {
    label: "Cursor",
    detect: [".cursor"],
    project: { copies: [[".cursor/rules/intake-refiner.mdc", ".cursor/rules/intake-refiner.mdc"]] },
  },
  cline: {
    label: "Cline",
    detect: [".clinerules"],
    project: { copies: [[".clinerules/intake-refiner.md", ".clinerules/intake-refiner.md"]] },
  },
  windsurf: {
    label: "Windsurf",
    detect: [".windsurfrules"],
    project: { copies: [[".windsurfrules", ".windsurfrules"]] },
  },
  zed: {
    label: "Zed",
    // Zed usa `.rules` como arquivo de regras padrão do projeto. Injetamos um
    // bloco marcado (nunca sobrescreve o `.rules` do usuário).
    detect: [".rules", ".zed"],
    project: { contract: ".rules", skillRef: "docs/INTAKE-PROTOCOL.md" },
  },
  aider: {
    label: "Aider",
    detect: [".aider.conf.yml", "CONVENTIONS.md"],
    project: {
      copies: [["CONVENTIONS.md", "CONVENTIONS.md"], [".aider.conf.yml", ".aider.conf.yml"]],
      note: "Rode o Aider com:  aider --read AGENTS.md --read CONVENTIONS.md",
    },
  },
};
const ORDER = ["claude", "codex", "antigravity", "copilot", "cursor", "cline", "windsurf", "zed", "aider"];

function parseArgs(argv) {
  const a = { targets: null, scope: null, yes: false, list: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--help" || v === "-h") a.help = true;
    else if (v === "--version" || v === "-v") a.version = true;
    else if (v === "--list") a.list = true;
    else if (v === "--yes" || v === "-y") a.yes = true;
    else if (v === "--target" || v === "--targets") a.targets = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (v.startsWith("--target=")) a.targets = v.slice(9).split(",").map((s) => s.trim()).filter(Boolean);
    else if (v === "--scope") a.scope = argv[++i];
    else if (v.startsWith("--scope=")) a.scope = v.slice(8);
  }
  return a;
}

function ensureDir(p) { fs.mkdirSync(path.dirname(p), { recursive: true }); }

function copyInto(srcRel, destAbs) {
  const src = path.join(PKG_ROOT, srcRel);
  ensureDir(destAbs);
  fs.copyFileSync(src, destAbs);
}

function ensureBlock(fileAbs, skillRef) {
  const block = blockBody(skillRef);
  let action;
  if (fs.existsSync(fileAbs)) {
    let content = fs.readFileSync(fileAbs, "utf8");
    const s = content.indexOf(START), e = content.indexOf(END);
    if (s !== -1 && e !== -1) {
      content = content.slice(0, s) + block + content.slice(e + END.length);
      action = "atualizado";
    } else {
      content = content.replace(/\s*$/, "") + "\n\n" + block + "\n";
      action = "bloco adicionado";
    }
    fs.writeFileSync(fileAbs, content);
  } else {
    ensureDir(fileAbs);
    fs.writeFileSync(fileAbs, block + "\n");
    action = "criado";
  }
  return action;
}

function detect(cwd) {
  return ORDER.filter((k) => TARGETS[k].detect.some((m) => fs.existsSync(path.join(cwd, m))));
}

// Já existe o protocolo neste escopo para este alvo? Sinal: bloco marcado no
// arquivo-contrato OU arquivo de skill/regra copiado.
function scopeHasProtocol(key, scope, cwd) {
  const t = TARGETS[key];
  const layout = scope === "global" ? t.global : t.project;
  if (!layout) return false;
  const base = scope === "global" ? layout.base() : cwd;
  if (layout.contract) {
    const f = path.join(base, layout.contract);
    try { if (fs.existsSync(f) && fs.readFileSync(f, "utf8").includes(START)) return true; } catch { /* ignore */ }
  }
  for (const [, destRel] of layout.copies || []) {
    if (fs.existsSync(path.join(base, destRel))) return true;
  }
  return false;
}

function installOne(key, scope, cwd, log) {
  const t = TARGETS[key];
  let layout = scope === "global" ? t.global : t.project;
  let effectiveScope = scope;
  if (scope === "global" && !t.global) {
    layout = t.project; effectiveScope = "project";
    log(`  ${c("yellow", "!")} ${t.label}: sem config global; instalando no projeto.`);
  }
  // Aviso não-bloqueante: se o protocolo já está no OUTRO escopo, instalar aqui
  // o carrega 2x por sessão (mais tokens, sem ganho).
  const otherScope = effectiveScope === "global" ? "project" : "global";
  if (TARGETS[key][otherScope] && scopeHasProtocol(key, otherScope, cwd)) {
    log(`  ${c("yellow", "!")} ${t.label}: protocolo já presente no escopo ${otherScope}. ` +
        `Manter os dois = carregar o intake 2x por sessão (mais tokens). Prefira um único escopo.`);
  }
  const base = effectiveScope === "global" ? layout.base() : cwd;
  const disp = (abs) => (effectiveScope === "global" ? abs.replace(os.homedir(), "~") : path.relative(cwd, abs) || abs);
  for (const [srcRel, destRel] of layout.copies || []) {
    const destAbs = path.join(base, destRel);
    copyInto(srcRel, destAbs);
    log(`  ${c("green", "✓")} ${disp(destAbs)}`);
  }
  if (layout.contract) {
    const fileAbs = path.join(base, layout.contract);
    const action = ensureBlock(fileAbs, layout.skillRef);
    log(`  ${c("green", "✓")} ${disp(fileAbs)} ${c("dim", "(" + action + ")")}`);
  }
  if (layout.note) log(`  ${c("cyan", "→")} ${layout.note}`);
}

function printHelp() {
  console.log(`
${c("bold", "agentic-prompt-intake")} ${c("dim", "v" + pkg.version)} — instalador do protocolo de intake

${c("bold", "Uso")}
  npx agentic-prompt-intake                      modo interativo
  npx agentic-prompt-intake --target claude,cursor --scope project --yes
  npx agentic-prompt-intake --list               lista alvos suportados

${c("bold", "Opções")}
  --target <a,b>   alvos: ${ORDER.join(", ")}, all
  --scope <s>      project (padrão) ou global
  --yes, -y        não interativo (usa detecção/opções dadas)
  --list           lista alvos e sai
  --help, -h       esta ajuda
  --version, -v    versão

${c("dim", REPO_URL)}
`);
}

function ask(rl, q) { return new Promise((res) => rl.question(q, (a) => res(a.trim()))); }

async function interactive(cwd) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(c("bold", "\n  Agentic Prompt Intake — instalador\n"));
  console.log("  Você fala como pensa; o agente clarifica antes de agir.\n");

  const found = detect(cwd);
  ORDER.forEach((k, i) => {
    const hit = found.includes(k) ? c("dim", "  (detectado)") : "";
    console.log(`   ${c("cyan", String(i + 1))}. ${TARGETS[k].label}${hit}`);
  });
  console.log(`   ${c("cyan", "a")}. Todas\n`);
  const def = found.length ? found.map((k) => ORDER.indexOf(k) + 1).join(",") : "1";
  const raw = (await ask(rl, `  Quais ferramentas? [${def}] `)) || def;
  let keys;
  if (raw.toLowerCase() === "a" || raw.toLowerCase() === "all") keys = ORDER.slice();
  else keys = raw.split(",").map((s) => ORDER[parseInt(s.trim(), 10) - 1]).filter(Boolean);
  if (!keys.length) { console.log(c("red", "  Nenhuma ferramenta válida selecionada.")); rl.close(); process.exit(1); }

  const sc = (await ask(rl, `  Escopo — ${c("bold", "p")}rojeto (esta pasta) ou ${c("bold", "g")}lobal (toda a máquina)? [p] `)) || "p";
  const scope = /^g/i.test(sc) ? "global" : "project";
  rl.close();
  return { keys, scope };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  if (args.version) return console.log(pkg.version);
  if (args.list) { ORDER.forEach((k) => console.log(`${k}\t${TARGETS[k].label}`)); return; }

  const cwd = process.cwd();
  let keys, scope;

  if (args.targets) {
    keys = args.targets.includes("all") ? ORDER.slice()
      : args.targets.map((t) => t.toLowerCase()).filter((t) => TARGETS[t]);
    scope = args.scope === "global" ? "global" : "project";
    if (!keys.length) { console.error(c("red", "Alvo inválido. Use --list.")); process.exit(1); }
  } else if (args.yes) {
    keys = detect(cwd); scope = args.scope === "global" ? "global" : "project";
    if (!keys.length) { console.error(c("red", "Nada detectado. Passe --target. Ex.: --target claude")); process.exit(1); }
  } else {
    ({ keys, scope } = await interactive(cwd));
  }

  console.log("");
  const lines = [];
  for (const k of keys) {
    lines.push(`${c("bold", TARGETS[k].label)} ${c("dim", "(" + scope + ")")}`);
    installOne(k, scope, cwd, (s) => lines.push(s));
  }
  console.log(lines.join("\n"));
  console.log(`\n${c("green", "✓ Pronto.")} O protocolo de intake está ativo para: ${keys.map((k) => TARGETS[k].label).join(", ")}.`);
  console.log(c("dim", `  Reabra/recarregue sua ferramenta de IA para aplicar. Docs: ${REPO_URL}\n`));
}

main().catch((e) => { console.error(c("red", "Erro: ") + (e && e.message ? e.message : e)); process.exit(1); });
