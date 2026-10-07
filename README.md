# CRM de Pedidos — Pão & Pizza

Painel de pedidos no estilo iFood para venda de pão caseiro e pizzas, com entrada
de pedidos a partir do WhatsApp (UAZAPI) e aviso automático de entrega.

## Como funciona

1. Cliente manda mensagem no WhatsApp.
2. A UAZAPI envia o evento para o webhook do app.
3. O painel toca o **alarme** (som + notificação + badge).
4. Você digita o pedido manualmente (itens, valor, endereço).
5. Ao clicar em **"Saiu para entrega"**, o app dispara a mensagem de WhatsApp
   para o cliente — se o envio falhar, o status **não** muda (rollback).

Fluxo do pedido: `novo → em_preparo → a_caminho → entregue` (ou `cancelado`).

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- PostgreSQL no **Neon** + Drizzle ORM (sem passo de migração: o schema é criado
  automaticamente na primeira requisição)
- UAZAPI para WhatsApp (webhook + envio de texto)
- Autenticação por senha única com cookie assinado (jose) e `src/proxy.ts`

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL, APP_PASSWORD e SESSION_SECRET
npm run dev
```

Abra http://localhost:3000

## Deploy na Vercel

1. `gh repo create Ifood --public --source=. --push` (ou suba no GitHub manualmente)
2. Na Vercel: **Add New → Project → Import** o repositório.
3. **Storage → Create → Neon** (o `DATABASE_URL` entra sozinho).
4. Environment variables:
   - `APP_PASSWORD`
   - `SESSION_SECRET` (64 hex aleatórios)
5. Deploy. Não é preciso rodar migração — o schema é criado sozinho.
6. Abra o app → **Config** → cole o token da instância UAZAPI → **Registrar webhook**.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | String de conexão do Neon Postgres |
| `APP_PASSWORD` | sim | Senha única do painel |
| `SESSION_SECRET` | sim | 32+ bytes para assinar o cookie |
| `WEBHOOK_SECRET` | não | Segredo pré-definido da URL do webhook |

## Rotas principais

| Rota | Descrição |
| --- | --- |
| `GET /` | Painel: faturamento do dia e fila |
| `GET /mensagens` | Caixa de entrada do WhatsApp |
| `GET /pedidos` | Lista e filtros de pedidos |
| `GET /pedidos/novo` | Digitação manual do pedido |
| `GET /pedidos/[id]` | Detalhe e transição de status |
| `GET /clientes` | Histórico de clientes |
| `GET /config` | UAZAPI, alarme e templates |
| `POST /api/webhook/uazapi/[secret]` | Recebe eventos da UAZAPI |

## Notas

- O polling do alarme roda a cada 4s (serverless no Vercel não mantém SSE/WebSocket abertos).
- Notificações nativas do navegador ficam disponíveis após clicar em
  **"Ativar notificações"** em Configurações.
- Web Push em segundo plano ficou fora do escopo inicial.
