# PWA e modo offline

## Objetivo

O aplicativo deve permanecer utilizável para partidas locais após a instalação e o primeiro carregamento concluído com sucesso.

## Responsabilidades de armazenamento

- Cache Storage / Workbox: shell da aplicação, JS, CSS, fontes, ícones e assets versionados.
- IndexedDB / Dexie: partidas, placares, eventos, configurações, histórico e conteúdo do usuário.
- Não usar cache HTTP ou Service Worker como banco de dados.

## Ciclo de uso

1. Usuário abre a aplicação online.
2. O Service Worker instala e armazena os recursos estáticos.
3. O usuário pode instalar a PWA.
4. Em acessos posteriores, o shell é servido do cache.
5. Dados de partidas são lidos e gravados no IndexedDB.

O primeiro acesso exige rede, salvo distribuição local prévia. Instalação PWA requer contexto seguro (HTTPS ou localhost).

## Funcionalidades offline

Obrigatórias:
- iniciar partida;
- alterar placar;
- persistir e recuperar estado;
- consultar regras/variantes já armazenadas;
- consultar histórico local;
- calcular estatísticas locais determinísticas.

Não garantidas offline:
- sincronização multi-dispositivo;
- compartilhamento remoto;
- IA hospedada;
- ingestão remota de documentos.

## Atualização e falhas

Atualizações do shell não podem apagar IndexedDB. Migrações Dexie devem ser incrementais e testadas. Falha de rede deve resultar em degradação explícita dos recursos online, sem bloquear o jogo.

## Limites

A disponibilidade offline depende de o navegador manter os dados do site. Oferecer exportação/importação futura para reduzir risco de perda. Não afirmar que armazenamento do navegador é backup permanente.
