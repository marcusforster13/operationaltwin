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
