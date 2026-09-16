# Deploy gratuito: Render + Supabase

Custo inicial: US$ 0 dentro das cotas Free; não habilitar upgrades ou adicionais pagos. Frontend permanece na Vercel. O backend e o banco exigem contas do proprietário.

1. **Supabase Free:** criar um projeto. O proprietário define a senha do banco no painel; não enviar senhas pelo chat.
2. No SQL Editor, executar `supabase/migrations/001_private_sessions.sql` uma vez. O script cria somente tabelas/função do Operational Twin.
3. Em Auth, desabilitar cadastro público. Criar o usuário operacional pelo painel, com e-mail confirmado e senha definida pelo proprietário. Obter seu UUID e inserir as permissões de Tabajaras/Cantagalo conforme exemplo no final do SQL, substituindo o UUID de exemplo pelo real.
4. Copiar Project URL e a chave **publishable** (ou legacy **anon**) para os campos de ambiente do Render. A API rejeita secret/service_role. Nenhuma senha de banco é necessária no aplicativo.
5. **Render Free:** importar este repositório como Blueprint (`render.yaml`). Nome: `operationaltwin-api`; plano Free; sem disco e sem banco Render pagos. Preencher `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. O endereço do serviço deve vir do deploy real, nunca ser presumido.
6. Conferir `/health`: `authRequired=true`, `storage=supabase`. `BACKEND_HOSTS` é opcional no Render, que informa seu hostname; para domínio próprio, configurá-lo explicitamente. `FRONTEND_ORIGINS` deve listar só os frontends HTTPS autorizados.
7. Só após validar o backend, configurar **Vercel** `VITE_BACKEND_URL` com o endereço HTTPS real e fazer novo deploy. Essa URL é pública; não é uma credencial.
8. Entrar, executar Demo Scenario 01, aguardar salvamento, sair/entrar e recuperar o replay. Verificar que outro usuário não vê as sessões e não acessa mapas sem permissão. Confirmar 401 sem token e 403 sem permissão.

Rollback: remover `VITE_BACKEND_URL` e redeployar o frontend restaura a simulação e o histórico do navegador. Os históricos remotos continuam no Supabase, separados dos locais.

Limites: Render Free pode suspender o processo após inatividade e perder simulações em andamento; sessões já salvas ficam no Supabase. Supabase Free pode pausar o projeto por inatividade. O login espera até 90 s pelo backend; se não responder, oferece nova tentativa. Não é operação contínua ou integração real DJI. Fazer exportações JSON periódicas; o plano gratuito não equivale a backup gerenciado de produção.

Testes locais: `npm test`, `npm run test:backend`, `npm run build`. O teste SQL usa PostgreSQL/PGlite com usuários sintéticos. Testes HTTP substituem somente a resposta externa de autenticação; a validação final do serviço Supabase exige o projeto real configurado.

Validação do login: 40 testes da aplicação e 4 testes de backend/SQL passaram; TypeScript e build aprovados. No navegador, contas sintéticas verificaram login, recuperação de replay de 266 frames, logout e isolamento ao entrar como outro usuário, sem erros no console. Esses testes não substituem a validação do Supabase real após o deploy.

## Implantação em 16/09/2026

- Frontend: https://operationaltwin.vercel.app/ — produção conectada ao Render; deploy Vercel B9qbJY3bJi2uxhh19VSsQyozyMR5 aprovado.
- API: https://operationaltwin-api.onrender.com — Render Free, Oregon, sem disco persistente; fonte Git 5476d30.
- Banco: Supabase DTT; migração 001 aplicada e RLS confirmado nas duas tabelas twin_*. Proprietário autorizado para Tabajaras e Cantagalo.
- Verificação remota: health 200, storage=supabase, authRequired=true; consulta de sessões sem token 401. Login real observado no navegador.
- Produção autenticada: replay de Cantagalo abriu e reproduziu 94 frames / 39,9 s. Nova demo Tabajaras gravou 77 frames / 32,8 s; a consulta SQL confirmou a sessão no Supabase, junto das demais sessões de ambas as localidades. Console sem erros ou avisos nesta validação.
- Cadastro público desativado e salvamento confirmado no Supabase. Após autorização do proprietário, RLS foi habilitado em players/payments e todos os privilégios diretos de PUBLIC, anon e authenticated foram revogados; dados preservados. Consulta posterior confirmou RLS=true e SELECT=false para anon/authenticated em ambas.
- Demo Scenario 01 concluído: incidente, três recursos, cinco waypoints, gravação e replay automático. Após sair da localidade e reabrir Tabajaras, o histórico foi consultado novamente no servidor e o replay de 77 frames / 32,8 s foi recuperado. O segundo login foi validado posteriormente, conforme registro abaixo.

- Auditoria no PostgreSQL real: transação com role authenticated e identidade sintética sem permissões retornou zero mapas e zero sessões; rollback executado. Isso testa as políticas RLS no banco, não substitui um segundo login real pela API.

- Segundo login real em produção: teste-isolamento@example.com autenticou e exibiu "Nenhuma localidade autorizada", sem cartões de mapas e com demonstração desabilitada. A conta principal permaneceu autenticada com replay e duas sessões de Tabajaras acessíveis. Console do usuário de teste sem erros/avisos. Este teste valida o fluxo UI; não foi feita chamada HTTP direta com o token do segundo usuário.
