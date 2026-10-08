# Gestão O&M

Painel de gestão de O&M: notificações de rede no mapa (troca de poste, irregularidade, limpeza e reordenamento de cabo), regularização de rede, retirada de equipamentos e relatórios.

**Esta é a versão de teste.** Ela começa vazia: a rota de cabos (KMZ), as notificações, a regularização, o financeiro e o combustível são importados por quem usa e ficam salvos apenas no navegador daquele computador. Nenhum dado da operação fica neste repositório.

## Arquivos

- `index.html`: o painel (telas e regras).
- `demo.js`: guarda os dados no navegador enquanto o banco de dados e o login não estão ligados.
- `rota.json`: rota vazia, usada até alguém importar o KMZ.
- `municipios.json`: limites de municípios do estado de São Paulo (IBGE).

## Próximas etapas

1. Banco de dados e login com a conta Microsoft da empresa.
2. Dados reais (rota de cabos, notificações, regularização) atrás do login.
3. Financeiro e combustível.

## Banco de dados e login (Supabase)

1. Crie o projeto no Supabase e rode o conteúdo de `supabase.sql` no SQL Editor.
2. Em `config.js`, preencha `url` (Project URL) e `key` (chave **anon/publishable**). Nunca a chave service_role/secret.
3. Cadastre os usuários em Authentication > Users e desligue o cadastro aberto ("Allow new users to sign up").

Enquanto `config.js` estiver vazio, o painel funciona no modo local (dados só no navegador).
