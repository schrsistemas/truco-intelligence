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
