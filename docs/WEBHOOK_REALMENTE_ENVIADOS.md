# Webhook: Realmente Enviados

Para que a coluna "Realmente enviados" seja preenchida, configure o webhook de status da Z-API.

## 1. Migrations

Execute as migrations (via Lovable deploy ou `npm run db:setup`):
- `delivered` na tabela `disparos`
- Tabela `disparo_messages`

## 2. Deploy da Edge Function

A função `z-api-webhook-message-status` precisa estar publicada no Supabase.

URL do webhook:
```
https://SEU_PROJECT.supabase.co/functions/v1/z-api-webhook-message-status
```

## 3. Configurar na Z-API

Para cada instância:

**Via API:**
```http
PUT https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/update-webhook-message-status
Header: Client-Token: SEU_CLIENT_TOKEN
Content-Type: application/json

{
  "value": "https://bbfxwizfafnoklhjnyus.supabase.co/functions/v1/z-api-webhook-message-status"
}
```

**Via Painel Z-API:**
- Acesse sua instância
- Webhooks → Status da mensagem
- Cole a URL acima

## Fluxo

1. Ao enviar mensagem, o sistema salva `zaapId` em `disparo_messages`
2. Quando o WhatsApp entrega, a Z-API envia POST para nosso webhook com `status: "RECEIVED"` e `ids: ["zaapId"]`
3. O webhook incrementa `disparos.delivered` e remove o registro de `disparo_messages`
