# Cantina ULBRA API

Back-end da cantina do campus: controla produtos, pedidos e relatórios de vendas, com regras de negócio validadas na API e no banco.

**Integrantes da dupla:**
- Arthur Marcante


**Disciplina:** Desenvolvimento Back-End — Aula 6 | Prof. Victor Costa Melo | ULBRA

## Tecnologias

- Node.js
- Express (rotas isoladas com `express.Router()`)
- Knex.js (Query Builder, migrations e seeds)
- SQLite3

## Como rodar

```bash
# 1. Instalar as dependências
npm install

# 2. Criar o banco (roda as migrations)
npx knex migrate:latest

# 3. Popular o banco (roda os seeds; limpa as tabelas antes de inserir)
npx knex seed:run

# 4. Iniciar o servidor (http://localhost:3000)
npm start
```

Para desenvolvimento com recarga automática: `npm run dev`.

## Estrutura

```
src/
├── controllers/   # regras de negócio
├── routes/        # somente definição de endpoints
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── connection.js
└── server.js      # aplica os prefixos /api/...
```

## Regras de negócio

| Regra | Descrição | Onde é aplicada |
|-------|-----------|-----------------|
| R1 | O preço vem do banco. `valor_total = preco × quantidade`; se o cliente enviar `valor_total`, é ignorado. | `POST /api/pedidos` |
| R2 | Só cria pedido se `estoque >= quantidade`; senão, `409`. | `POST /api/pedidos` |
| R3 | Criar pedido debita estoque; deletar pedido devolve. | `POST` e `DELETE /api/pedidos` |
| R4 | Produto com `ativo = false` não vende (`400`). | `POST /api/pedidos` |
| R5 | Produto com pedidos vinculados não pode ser deletado (`409`). | `DELETE /api/produtos/:id` |

## Endpoints

### Produtos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/produtos` | Lista produtos. Filtros opcionais: `?categoria=Bebidas&ativo=true` |
| GET | `/api/produtos/:id` | Retorna um produto (`404` se não existir) |
| POST | `/api/produtos` | Cria produto (`400` campo inválido, `409` nome duplicado) |
| PUT | `/api/produtos/:id` | Atualiza produto, inclusive o campo `ativo` |
| DELETE | `/api/produtos/:id` | Remove produto (`409` se houver pedidos — R5) |

**Exemplo — `POST /api/produtos`**

```json
{ "nome": "Água", "categoria": "Bebidas", "preco": 3.0, "estoque": 10 }
```

Resposta `201`:

```json
{ "id": 9, "nome": "Água", "categoria": "Bebidas", "preco": 3, "estoque": 10, "ativo": 1 }
```

**Exemplo — `PUT /api/produtos/9`**

```json
{ "preco": 3.5, "ativo": false }
```

Resposta `200`: o produto atualizado.

**Exemplo — `DELETE /api/produtos/1`** (produto com pedidos) → `409`:

```json
{ "erro": "Não é possível excluir: existem pedidos vinculados a este produto. Desative-o (ativo = false) em vez de excluir." }
```

### Pedidos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pedidos` | Lista com paginação (`?limit=10&offset=0`, padrão 10/0) e filtro opcional `?aluno=ana` |
| GET | `/api/pedidos/:id` | Retorna o pedido com o nome do produto (JOIN) |
| POST | `/api/pedidos` | Cria pedido (R1, R2, R4, em transação) |
| DELETE | `/api/pedidos/:id` | Cancela pedido e devolve estoque (R3, em transação) |

**Exemplo — `POST /api/pedidos`**

```json
{ "aluno_nome": "Ana Souza", "produto_id": 1, "quantidade": 2, "valor_total": 0.01 }
```

Resposta `201` (o `valor_total` enviado foi ignorado; 2 × 6,50 = 13):

```json
{
  "id": 7,
  "aluno_nome": "Ana Souza",
  "produto_id": 1,
  "quantidade": 2,
  "valor_total": 13,
  "created_at": "2026-11-25 18:00:02",
  "updated_at": "2026-11-25 18:00:02"
}
```

Erros: `400` (produto inativo ou dados inválidos), `404` (produto inexistente), `409` (estoque insuficiente):

```json
{ "erro": "Estoque insuficiente: disponível 48, solicitado 999." }
```

**Exemplo — `GET /api/pedidos/7`**

```json
{
  "id": 7,
  "aluno_nome": "Ana Souza",
  "produto_id": 1,
  "produto_nome": "Coxinha",
  "quantidade": 2,
  "valor_total": 13,
  "created_at": "2026-11-25 18:00:02",
  "updated_at": "2026-11-25 18:00:02"
}
```

**Exemplo — `GET /api/pedidos?limit=2&offset=0&aluno=ana`**

```json
{
  "total": 2,
  "limit": 2,
  "offset": 0,
  "dados": [
    { "id": 1, "aluno_nome": "Ana Souza", "produto_id": 1, "quantidade": 2, "valor_total": 13, "created_at": "2026-11-02 10:15:00", "updated_at": "2026-11-02 10:15:00" }
  ]
}
```

### Relatórios

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/relatorios/vendas-por-categoria` | Total vendido (R$) e itens por categoria (`groupBy`, `sum`, `count`) |
| GET | `/api/relatorios/top-produtos` | Os 5 produtos mais vendidos |
| GET | `/api/relatorios/faturamento?data_inicio=AAAA-MM-DD&data_fim=AAAA-MM-DD` | Soma do `valor_total` no período (`whereBetween`) |

**Exemplo — `GET /api/relatorios/vendas-por-categoria`**

```json
[
  { "categoria": "Salgados", "total_vendido": 60.5, "quantidade_itens": 9, "total_pedidos": 3 },
  { "categoria": "Doces", "total_vendido": 24, "quantidade_itens": 3, "total_pedidos": 1 }
]
```

**Exemplo — `GET /api/relatorios/top-produtos`**

```json
[
  { "id": 1, "nome": "Coxinha", "total_vendido": 5 },
  { "id": 2, "nome": "Pastel de Carne", "total_vendido": 4 }
]
```

**Exemplo — `GET /api/relatorios/faturamento?data_inicio=2026-11-01&data_fim=2026-11-30`**

```json
{ "data_inicio": "2026-11-01", "data_fim": "2026-11-30", "faturamento": 96.5, "total_pedidos": 6 }
```

## Transação do Knex: onde e por quê

Usamos `db.transaction()` em **dois lugares**, ambos em `src/controllers/pedidosController.js`:

1. **`POST /api/pedidos`** — criar um pedido exige duas operações: (a) inserir a linha em `pedidos` e (b) diminuir o `estoque` em `produtos`.
2. **`DELETE /api/pedidos/:id`** — cancelar exige (a) devolver a quantidade ao `estoque` e (b) apagar o pedido.

**Por que:** sem transação, se a primeira operação funcionar e a segunda falhar (queda, erro, bug), o banco fica inconsistente: pedido criado sem baixar estoque (vende o que não tem) ou estoque devolvido com o pedido ainda existindo. A transação garante **tudo ou nada** (atomicidade): se qualquer passo lançar erro, o Knex faz `ROLLBACK` automático e o banco volta ao estado anterior.

Também colocamos as **validações dentro da transação** (produto existe, está ativo, tem estoque). Assim a leitura do estoque e a baixa acontecem juntas, e o `throw` de uma regra violada (ex.: `409` de estoque insuficiente) cancela tudo sem deixar rastro. Esse comportamento foi testado: um pedido com quantidade acima do estoque retorna `409` e o estoque permanece igual.

## Outras decisões

- **Integridade referencial:** `PRAGMA foreign_keys = ON` no `knexfile.js` (o SQLite não aplica FK por padrão) e `CHECK` no banco para `estoque >= 0` e `quantidade >= 1`.
- **Segurança:** nenhuma consulta é montada por concatenação de strings; só Knex com parâmetros (proteção contra SQL Injection).
- **Relatórios:** usam `select()` com colunas específicas, sem `select('*')`.
- **Erros:** todos os endpoints usam `try/catch` e retornam `500` controlado em falhas inesperadas.
