# Arquitetura — Truco Intelligence

## Visão geral

O sistema é uma PWA offline-first. O núcleo de jogo não depende de rede, backend ou inteligência artificial.

```text
React + MUI (interface)
        |
Aplicação / casos de uso
        |
Game Engine (TypeScript determinístico)
        |
Repositórios locais (Dexie / IndexedDB)
        |
Eventos imutáveis + estado materializado

Recursos opcionais online:
API Node.js -> sincronização -> PostgreSQL (+ pgvector opcional)
                         |
                  AI Gateway -> Orquestrador -> agentes
                                      |
                              RAG / fontes citadas
```

## Camadas

### Apresentação
React, TypeScript, MUI e Vite. A interface não implementa regras de pontuação diretamente; chama casos de uso.

### Aplicação
Coordena comandos, validações, transações e repositórios. Não conhece detalhes visuais nem fornecedores de IA.

### Domínio
Motor de regras puro e determinístico. Recebe estado da partida, variante e comando; retorna novo estado e eventos. Não faz I/O.

### Infraestrutura local
Dexie/IndexedDB para partidas, eventos, configurações e dados de conhecimento baixados. Service Worker/Cache Storage para shell, fontes e assets.

### Serviços remotos opcionais
Backend Node.js e PostgreSQL para sincronização e colaboração. AI Gateway desacopla o produto dos provedores de modelos. A ausência desses serviços não bloqueia o modo local.

## Eventos de domínio

Eventos planejados:
- GAME_STARTED
- CARD_PLAYED
- TRUCO_REQUESTED
- TRUCO_ACCEPTED
- TRUCO_DECLINED
- ROUND_FINISHED
- SCORE_UPDATED
- GAME_FINISHED

Cada evento deve possuir `eventId` (UUID), `gameId`, `sequence`, `type`, `schemaVersion`, `occurredAt` e payload tipado. A sequência é monotônica por partida. A persistência deve impedir duplicação por `eventId`.

## Estado e consistência

- Event log é a trilha de auditoria.
- Estado materializado acelera a leitura da mesa.
- Comando e gravação de evento/estado devem ocorrer em uma transação IndexedDB.
- O estado pode ser reconstruído a partir dos eventos.
- Conflitos de sincronização futura devem ser resolvidos no domínio, nunca por sobrescrita cega do placar.

## Modelo de dados futuro

- game_variants
- game_rules_versions
- games
- teams
- players
- game_players
- game_events
- game_rounds
- game_scores
- player_statistics
- knowledge_documents
- knowledge_chunks
- ai_sessions
- ai_interactions
- behavior_profiles

No MVP, manter o esquema local mínimo e evoluir por migrações Dexie.

## IA

Agentes previstos: Strategy, Probability, Teacher, Behavior, Psychology, Etymology, Historian e Coach. O orquestrador seleciona agentes por intenção. Nenhum agente tem autoridade para alterar o placar ou validar regras.

## Decisões e restrições

- React + TypeScript + MUI + Vite.
- PWA com Workbox.
- Dexie/IndexedDB para dados locais.
- Zustand para estado de interface compartilhado quando necessário.
- PostgreSQL e pgvector são opcionais.
- Contratos versionados e fornecedores substituíveis.
- Sem dependência obrigatória paga.
