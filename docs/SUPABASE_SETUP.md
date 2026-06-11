# 🗄️ Configuração Local do Supabase (Ambiente de Desenvolvimento)

Este documento descreve como configurar as variáveis de ambiente necessárias para rodar o Siplan Hub localmente em qualquer nova máquina.

## Arquivo `.env` Local

Para que a aplicação conecte-se ao banco de dados e APIs do Supabase, você precisa criar um arquivo chamado `.env` ou `.env.local` na **raiz do projeto** (`d:\AI\siplan-hub`) com o seguinte conteúdo:

```env
VITE_SUPABASE_URL=https://okvufcwkophaadttmjwa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnVmY3drb3BoYWFkdHRtandhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjg4MDMsImV4cCI6MjA3OTkwNDgwM30.gxtnueJW2Q33RLpJNjCj-jbC-S8Y_Vx10NgeNtP10vk
```

> [!WARNING]
> Nunca envie este arquivo `.env` para o repositório git. Ele já está listado no `.gitignore` para proteção das chaves.

---

## Como obter essas chaves no painel do Supabase

Caso precise gerar ou recuperar as chaves no futuro:

1. Acesse o Painel do Supabase do projeto:
   👉 **[Supabase Dashboard - Siplan HUB](https://supabase.com/dashboard/project/okvufcwkophaadttmjwa)**
2. No menu lateral esquerdo, clique em **Settings** (ícone de engrenagem no rodapé).
3. Selecione a opção **API** (em *Configuration*).
4. Em **Project API keys**, copie a chave correspondente à linha **`anon` `public`**.
