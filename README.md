# Truco Intelligence

Plataforma de truco com contador de pontos, partidas locais, variantes configuráveis, histórico, estatísticas e recursos de inteligência artificial opcionais.

## Princípios

- Offline-first: o jogo e seus dados essenciais permanecem no dispositivo.
- Motor de regras determinístico, separado da interface e da IA.
- Variantes configuráveis e regras versionadas.
- Dados locais em IndexedDB.
- IA e sincronização são complementares.
- Meta de custo incremental obrigatório: R$ 0,00.

Leia primeiro [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md) e [COST-POLICY.md](COST-POLICY.md).

## Stack

- React + TypeScript + Vite
- Material UI
- PWA / Workbox
- Dexie / IndexedDB
- Vitest

## Requisitos

- Node.js LTS
- npm

## Executar

```bash
npm install
npm run dev
```

## Validar

```bash
npm run test
npm run lint
npm run build
```

## Estrutura

```text
src/
  app/          aplicação e tema
  domain/       regras puras do jogo
  infrastructure/ persistência local
  components/   componentes de interface
docs/           documentação funcional e técnica
```

## Estado atual

MVP inicial: contador local com persistência IndexedDB, alvo configurável entre 12 e 15 pontos e trilha de eventos. A implementação evoluirá sem introduzir dependência de backend.

## Documentação

- [Arquitetura](ARCHITECTURE.md)
- [Política de custo zero](COST-POLICY.md)
- [PWA e offline](docs/OFFLINE-PWA.md)
- [Variantes e regras](docs/GAME-RULES.md)
- [Orquestração de IA](docs/AI-ORCHESTRATION.md)
- [Capacidade e escalabilidade](docs/engineering-capacity-and-scalability.md)
- [RAG e conhecimento](docs/RAG-KNOWLEDGE.md)
