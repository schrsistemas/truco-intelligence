# RAG e base de conhecimento

## Objetivo

Permitir consulta de regras, variantes, história e estratégia com rastreabilidade de fontes. RAG não é fine-tuning e não substitui o motor de regras.

## Metadados mínimos

Cada documento deve registrar:
- documentId;
- título e autor/editor, quando conhecidos;
- URL ou referência bibliográfica;
- variante e região relacionadas;
- idioma;
- data de publicação, quando disponível;
- data de ingestão;
- versão/hash do conteúdo;
- licença e permissões de uso;
- nível de confiabilidade e método de avaliação.

Cada fragmento deve manter referência ao documento de origem e posição no documento.

## Pipeline

1. Ingestão de conteúdo permitido.
2. Normalização sem apagar contexto regional.
3. Segmentação em chunks.
4. Embeddings (pré-calculados ou locais, quando viável).
5. Indexação.
6. Recuperação filtrada por variante e intenção.
7. Resposta com fontes e indicação de incerteza.

## Offline e custo

A base essencial pode ser distribuída como conteúdo local versionado. Busca textual local é o primeiro fallback. Embeddings, pgvector e LLM remoto são opcionais e não bloqueiam o produto.

## Qualidade

Não misturar variantes sem indicar a origem. Não apresentar tradição oral ou relato isolado como regra universal. Registrar divergências e preferir fontes primárias quando disponíveis.
