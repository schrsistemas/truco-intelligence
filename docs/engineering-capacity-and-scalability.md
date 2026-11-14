# Capacidade e escalabilidade — Truco Intelligence

Padrão específico do Truco Intelligence, alinhado à diretiva transversal aprendida com o incidente de quota KV do PescaRadar em 14/11/2026.

## Premissa de produto

A capacidade primária do jogo é local. O contador, regras, placar e histórico essencial devem funcionar sem backend, cloud ou provedor de IA. Serviços remotos são complementares e nunca podem ser pré-requisito para iniciar, continuar ou recuperar uma partida local.

## Diretrizes

1. **Custo zero:** não introduzir APIs, bancos, hospedagem, LLMs, trials, cartões ou recursos faturáveis. A arquitetura deve permanecer útil sem serviço remoto.
2. **Persistência correta:** IndexedDB guarda dados estruturados da aplicação (partidas, eventos, configurações e histórico). Cache Storage/Service Worker guarda somente assets e recursos de aplicação.
3. **Integridade:** eventos de partida são imutáveis, identificados por UUID e ordenados por sequência; placar deve ser derivável ou validável contra eventos. Guardar variante e versão exata das regras.
4. **Dimensionamento local:** testar grande volume de partidas/eventos, limites de armazenamento do navegador, paginação, importação/exportação, compactação e migrações do IndexedDB.
5. **Sincronização opcional:** se adicionada futuramente, dimensionar operações por conta, dispositivo, partida e evento; usar idempotência, controle de versão, resolução explícita de conflitos e backpressure.
6. **Falhas:** offline, reconexão, timeout, 429, indisponibilidade remota e interrupção durante gravação não podem corromper nem apagar partidas locais. Retry deve ser limitado e não duplicar eventos.
7. **Separação de capacidades:** medir separadamente o contador local, persistência local, sincronização multi-dispositivo, analytics e IA remota. Não afirmar que uma capacidade remota existe enquanto estiver apenas planejada.
8. **IA:** LLM é opcional, não decide nem altera estado oficial da partida. Avaliar limites e custo de inferência antes de qualquer integração; não depender de crédito promocional.
9. **Testes:** cobrir volume, concorrência entre abas, atualização/recuperação, migrações IndexedDB, falhas durante transação, deduplicação e uso integral sem rede.
10. **Evidência:** não declarar suporte a determinado número de usuários/dispositivos sem cenário de carga reproduzível e resultados medidos.

## Checklist

- [ ] Partida inicia e continua offline.
- [ ] Eventos e placar permanecem íntegros após fechar/reabrir.
- [ ] Histórico extenso não degrada a interface sem paginação/limites.
- [ ] Migrações IndexedDB preservam dados existentes.
- [ ] Cache PWA não é usado como banco de dados.
- [ ] Recursos remotos são opcionais, isolados e substituíveis.
- [ ] Conflitos e sincronização (se implementados) são idempotentes e testados.
- [ ] Custo total permanece R$ 0.
- [ ] Capacidade declarada possui evidência.

Este documento é uma diretiva de engenharia, não uma declaração de que sincronização remota, testes de carga ou limites de armazenamento já foram implementados.
