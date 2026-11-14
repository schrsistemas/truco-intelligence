# Variantes e motor de regras

## Princípio

Não existe uma única regra universal de truco. Paulista, Mineiro, Gaúcho e regras regionais podem divergir. A aplicação deve representar variantes como configuração versionada, sem codificar pressupostos regionais na interface.

## Contrato de variante implementado

O domínio define `GameVariant` em `src/domain/variant.ts`, com:

- `variantId`: identificador estável, em minúsculas;
- `name`: nome apresentado ao usuário;
- `rulesVersion`: versão inteira e positiva;
- `targetScore`: alvo suportado pelo contador atual (12 ou 15);
- `playersPerTeam`: de 1 a 4;
- `rules`: objeto JSON para parâmetros específicos da variante.

A função `validateVariant` valida os metadados e garante que `rules` seja JSON serializável. Ela não afirma validar o significado das regras regionais: cada perfil de regras precisará de um interpretador próprio e de testes de conformidade.

A variante inicial `custom-scoreboard` é explicitamente um perfil de contador. Não deve ser apresentada como implementação completa de Truco Paulista, Mineiro ou Gaúcho.

## Configuração de variante

Modelo conceitual de parâmetros específicos:

```json
{
  "variantId": "custom-scoreboard",
  "name": "Contador personalizado",
  "rulesVersion": 1,
  "targetScore": 12,
  "playersPerTeam": 2,
  "rules": {}
}
```

O objeto `rules` permanece extensível. Não preencher valores regionais por suposição; cada conjunto de regras deve ser documentado e testado antes de ser habilitado.

## Versionamento

Cada partida deve referenciar `variantId` e `rulesVersion`. Alterar uma regra cria nova versão; partidas antigas continuam vinculadas à versão original. Uma versão publicada não deve ser modificada retroativamente.

## Motor

O motor recebe estado + configuração + comando e retorna resultado determinístico. Não deve depender de React, IndexedDB, HTTP ou LLM.

## Placar

O contador inicial permite alvo de 12 ou 15 pontos. Atingir o alvo encerra a partida. O domínio valida:
- incremento/decremento inteiro;
- pontuação não negativa;
- não ultrapassar alvo;
- não pontuar partida encerrada;
- identificar vencedor.

A interface deve refletir o resultado retornado pelo domínio.

## Eventos

Eventos são imutáveis e ordenados por sequência por partida. Identificadores UUID permitem deduplicação. Eventos devem carregar versão de schema para evolução compatível.

Eventos planejados: GAME_STARTED, GAME_RESET, CARD_PLAYED, TRUCO_REQUESTED, TRUCO_ACCEPTED, TRUCO_DECLINED, ROUND_FINISHED, SCORE_UPDATED e GAME_FINISHED.


## Persistência de partidas

O banco local Dexie usa a versão 2 do schema. A migração preserva o registro legado `active`, adiciona metadados de variante/status/datas e cria a tabela de configurações para identificar a partida ativa.

Cada partida possui UUID próprio. Eventos usam sequência independente por `gameId`, com índice composto `[gameId+sequence]`. A gravação do snapshot e dos eventos ocorre em uma única transação IndexedDB. Repetições de `eventId` são ignoradas.

A aplicação mantém as últimas 20 partidas na seção de histórico. Selecionar uma partida a torna ativa; criar nova partida não apaga as anteriores. Os nomes das duplas são persistidos no registro da partida.

A migração de schema foi desenhada para preservar os dados da versão 1. A validação em navegador real ainda é necessária para confirmar comportamento em dispositivos com IndexedDB preexistente.

## Ciclo de vida e auditoria

Partidas criadas pela aplicação registram `GAME_STARTED` como primeiro evento (sequência 1). O evento contém o snapshot inicial do placar. Cada evento persistido recebe `schemaVersion: 1`, permitindo evoluir o formato sem reinterpretar silenciosamente registros antigos.

A consulta `listGameEvents(gameId)` devolve os eventos em ordem de sequência. A interface apresenta os dez eventos mais recentes, sem alterar ou reordenar os registros persistidos. Partidas legadas migradas preservam seus eventos existentes; não é fabricado um evento de início retroativo quando não há evidência histórica suficiente.

O histórico de eventos é uma trilha de auditoria. O snapshot atual continua sendo usado para renderização rápida; uma etapa futura deverá implementar reconstrução/verificação integral do estado a partir da trilha e testes de consistência.
## Estatísticas locais

O domínio `src/domain/statistics.ts` agrega partidas encerradas por nome de dupla, calculando jogos, vitórias, derrotas, empates, pontos a favor, pontos contra e aproveitamento. Partidas em andamento são excluídas para não distorcer os indicadores. A agregação normaliza maiúsculas/minúsculas e espaços externos; nomes iguais representam a mesma identidade estatística.

A consulta estatística usa todas as partidas locais, enquanto a lista visual do histórico permanece limitada às 20 mais recentes. Os indicadores são calculados no dispositivo e não dependem de rede ou IA.

## Cadastro de jogadores

O schema Dexie versão 3 adiciona o roster individual em cada partida. Cada assento possui UUID, equipe, posição (seat) e nome. A quantidade de assentos por equipe deriva de `variant.playersPerTeam` (1 a 4); portanto, a interface não fixa a partida em duplas. Partidas existentes recebem assentos vazios durante a migração, sem alterar placar, nomes das equipes ou eventos históricos.

O cadastro de nomes é local à partida e pode ser editado antes ou durante o contador. O modelo não presume ordem de distribuição, posição de mão, embaralhamento ou regras de cartas. Esses comportamentos serão definidos pelo interpretador versionado da variante antes da implementação do registro de cartas e das rodadas.


## Baralho e distribuição (núcleo neutro)

O módulo `src/domain/cards.ts` representa cartas por `rankId` e `suitId`. A definição de baralho contém catálogos explícitos de ranks e naipes, e `createDeck` gera o produto cartesiano desses catálogos. Não há força, manilha, ordem de naipes ou descarte implícitos.

`dealCards` recebe uma sequência já ordenada, os IDs dos jogadores e a quantidade de cartas por jogador. Distribui em ciclo (uma carta para cada jogador por passagem), devolvendo mãos e monte restante. A função não embaralha: o embaralhamento e a ordem inicial deverão ser fornecidos pela política da variante, com algoritmo e fonte de aleatoriedade testáveis.

A definição atual é infraestrutura de domínio, ainda não vinculada ao perfil `custom-scoreboard`. O registro de cartas em uma partida só será habilitado quando uma variante fornecer composição, quantidade por jogador, política de embaralhamento e interpretador de força/desempate. Isso evita apresentar um baralho genérico como regra oficial de qualquer região.


## Motor neutro de mãos e rodadas

O módulo `src/domain/rounds.ts` implementa o ciclo de mão sem codificar regra regional:

- `startHand` valida a identificação e versão da variante, os jogadores, a distribuição recebida e a unicidade das cartas;
- `playCard` exige que a carta pertença à mão do jogador, impede duas jogadas do mesmo jogador na rodada e remove a carta após a jogada válida;
- a rodada só é avaliada quando todos os jogadores cadastrados tiverem jogado;
- `RoundEvaluator` é injetado pela variante e retorna o jogador vencedor ou `null` para empate;
- `startNextRound` só abre a próxima rodada após a conclusão da anterior e respeita `maxRounds`;
- `HandResolver` recebe o histórico de rodadas e decide se a mão terminou e qual equipe venceu. Empates e critérios de encerramento permanecem sob responsabilidade da variante.

Os eventos `HAND_STARTED`, `CARD_PLAYED`, `ROUND_FINISHED` e `HAND_FINISHED` são emitidos como dados imutáveis. Esta etapa ainda não persiste o estado da mão no Dexie nem conecta o motor à interface; isso exige primeiro fechar o contrato de configuração e interpretação da variante.

O núcleo neutro não determina força de carta, manilha, ordem de naipes, sequência de jogadores, regra de empate, pedido de truco ou pontuação da mão. O perfil `custom-scoreboard` não deve ser apresentado como se essas regras já estivessem implementadas.


## Escalada configurável de apostas

O módulo `src/domain/bidding.ts` fornece uma máquina de estados independente da variante. A variante entrega `initialStake` e uma lista ordenada de níveis, cada um com identificador, rótulo, valor após aceite e pontos atribuídos ao solicitante em caso de recusa.

- `requestBid` abre solicitação somente para o próximo nível da escada;
- enquanto houver solicitação pendente, não é possível abrir outra;
- somente a equipe adversária pode aceitar ou recusar;
- `acceptBid` atualiza o valor vigente e permite a próxima escalada;
- `declineBid` encerra a disputa e registra a equipe e os pontos concedidos;
- identificadores devem ser únicos, valores crescem estritamente e a recusa não pode conceder mais que o valor vigente antes da proposta.

Os rótulos Truco, Seis, Nove e Doze aparecem apenas como configuração de teste. Não são ativados como regra oficial de uma variante. O motor não altera diretamente o placar: a camada de aplicação deverá consumir o evento de recusa e aplicar a pontuação em transação atômica com o histórico.
