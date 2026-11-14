# AGENTS.md — Truco Intelligence

Este arquivo contém regras obrigatórias para qualquer pessoa ou agente que altere o projeto. Em caso de conflito, estas diretivas prevalecem sobre convenções locais menos específicas.

## 1. Objetivo e escopo

Construir o Truco Intelligence como uma plataforma de jogo, aprendizagem e análise de truco, com variantes configuráveis e experiência prioritariamente offline.

A primeira entrega é um contador de pontos confiável. A evolução prevista inclui motor de regras, histórico de partidas, estatísticas, assistente de jogo, professor, análise comportamental e base de conhecimento (RAG).

## 2. Regras obrigatórias de execução

- Trabalhar diretamente na branch `main`, conforme orientação do mantenedor.
- Não criar branches, pull requests ou fazer deploy sem solicitação explícita.
- Antes de editar, inspecionar os arquivos, contratos, arquitetura, regras de segurança e testes existentes.
- Preservar todo trabalho preexistente. Nunca sobrescrever arquivos sem ler seu conteúdo e verificar o estado atual.
- Atualizar a documentação correspondente a cada mudança arquitetural ou funcional.
- Executar testes, lint e build aplicáveis antes de concluir; informar claramente o que foi e não foi executado.
- Não afirmar que algo foi implementado, testado, commitado ou publicado sem confirmação da ferramenta correspondente.
- Evitar dependências e serviços proprietários quando houver alternativa livre adequada.

## 3. Política de custo zero

A meta é custo financeiro incremental de software e infraestrutura de R$ 0,00.

- Não contratar planos, APIs, bancos, hospedagem ou modelos pagos.
- Não habilitar billing automático, upgrade automático ou fallback para serviço pago.
- Não assumir cotas gratuitas ilimitadas ou permanentes.
- Priorizar software livre, execução local, armazenamento no dispositivo e serviços gratuitos com limites documentados.
- Qualquer integração remota deve ser opcional, substituível e possuir limites explícitos.
- Ao atingir limites gratuitos, interromper somente o recurso remoto; preservar os dados e manter as funções locais.
- Nunca degradar silenciosamente para um serviço pago.
- A arquitetura principal deve funcionar sem backend, sem cloud e sem LLM.

A gratuidade de terceiros pode mudar. Portanto, a garantia do projeto é independência arquitetural e ausência de dependência obrigatória paga, não a promessa de que um fornecedor externo manterá seu free tier para sempre.

Ver `COST-POLICY.md`.

## 4. Arquitetura e separação de responsabilidades

- Frontend: React, TypeScript, MUI e Vite.
- PWA: Service Worker e Workbox para recursos estáticos.
- Dados locais: IndexedDB, com Dexie como camada de acesso.
- Estado de interface: Zustand quando o estado compartilhado justificar seu uso.
- Motor de jogo: TypeScript determinístico, puro e independente de UI, rede e IA.
- Backend Node.js: opcional, não necessário para jogar localmente.
- Persistência remota futura: PostgreSQL; pgvector somente quando houver necessidade comprovada.
- IA: gateway independente de fornecedor e orquestrador multiagente opcional.
- Comunicação interna: eventos tipados e contratos versionados.

Não armazenar dados de partida somente no cache do Service Worker. Cache Storage é para recursos; IndexedDB é para dados estruturados do usuário.

## 5. Offline-first

O aplicativo deve permitir, após a instalação/primeiro carregamento bem-sucedido:
- abrir a aplicação sem conexão;
- iniciar e manter partidas;
- atualizar placar;
- persistir e recuperar partidas locais;
- consultar regras e variantes já disponíveis localmente;
- consultar histórico e estatísticas calculáveis no dispositivo.

Sincronização multi-dispositivo, IA remota e recursos dependentes de cloud exigem conexão e devem ser identificados como opcionais. Um LLM remoto não é considerado funcionalidade offline.

## 6. Integridade de partidas

- Cada partida deve guardar a variante e a versão exata das regras utilizadas.
- Eventos de partida são imutáveis, identificados por UUID e ordenados por sequência dentro da partida.
- Operações que possam ser repetidas devem ser idempotentes.
- O placar deve ser derivável dos eventos ou validável contra eles.
- Regras devem ser determinísticas, testáveis e independentes da IA.
- Não aplicar regra de uma variante a outra por suposição.
- Atingir a pontuação-alvo deve encerrar a partida conforme a configuração da variante.

## 7. IA e conhecimento

- IA nunca decide nem altera diretamente o estado oficial da partida.
- A IA recebe estado, variante e versão das regras como contexto explícito.
- Análises devem distinguir fatos observados, estimativas e hipóteses.
- Perfis comportamentais não podem afirmar intenção, blefe ou traços psicológicos sem evidência suficiente.
- RAG deve registrar origem, versão, variante, data e confiabilidade das fontes.
- Respostas baseadas em conhecimento devem permitir rastrear suas fontes.
- O produto deve continuar utilizável sem qualquer provedor de IA.

## 8. Qualidade e testes

Cobrir pelo menos:
- limites e validações do placar;
- pontuação-alvo e encerramento;
- persistência e recuperação local;
- idempotência e ordenação de eventos;
- variantes e versionamento de regras;
- comportamento offline;
- compatibilidade de migrações do IndexedDB.

## 9. Documentação

Manter atualizados:
- `README.md`: instalação, execução e visão geral;
- `ARCHITECTURE.md`: componentes, limites e decisões;
- `COST-POLICY.md`: política de custo zero;
- `docs/OFFLINE-PWA.md`: comportamento offline;
- `docs/GAME-RULES.md`: variantes e motor de regras;
- `docs/AI-ORCHESTRATION.md`: IA e agentes;
- `docs/RAG-KNOWLEDGE.md`: ingestão, fontes e recuperação.

## 10. Critério de conclusão

Uma tarefa só pode ser marcada como concluída quando código, documentação e testes aplicáveis estiverem coerentes. Relatar arquivos alterados, validações executadas, limitações e próximos passos.
