# Operational Twin 3D — V1

React, TypeScript, Vite e Three.js. Tabajaras e Cantagalo usam GLBs reais; operações e recursos são simulados.

## Rodar

Node.js 22.12+ e npm. Na pasta deste arquivo:

```sh
npm ci
npm run dev
```

Abra a URL impressa no terminal. Selecione uma localidade ou **EXECUTAR DEMONSTRAÇÃO**. No modo manual: ative Waypoint, clique no terreno, ajuste alturas/velocidade e inicie a missão. A gravação começa junto; encerre a sessão e abra a aba Replay. A demo usa os mesmos módulos e termina com resumo.

## Verificar e produzir

```sh
npm test
npm run build
npm run preview
```

O build valida os dois cabeçalhos GLB e executa TypeScript. `dist/` é o artefato estático completo; sirva-o por HTTP(S), não por `file://`. O alias esbuild-wasm evita a dependência do executável esbuild nativo neste ambiente Windows.

## Deploy na Vercel

Importe o projeto com preset Vite, comando `npm run build` e saída `dist`; `vercel.json` já contém essas opções. Alternativamente, com a CLI Vercel instalada e autenticada, execute `vercel` e depois `vercel --prod`. O deploy na Vercel depende da conexão deste repositório e da URL de distribuição dos mapas.

Os GLBs comprimidos somam 254,1 MB (242,3 MiB): o upload CLI excede o limite Hobby de 100 MB (Pro: 1 GB, conforme [Vercel](https://vercel.com/docs/limits)). Para manter os mapas fora do upload:

1. Hospede os GLBs comprimidos de public/maps em um servidor de assets, nas pastas `tabajaras/map.glb` e `cantagalo/map.glb`, com CORS permitido para a aplicação e tipo `model/gltf-binary`.
2. Defina `VITE_MAPS_BASE_URL` como a URL pública da pasta que contém essas duas localidades, no ambiente de build. Essa URL é pública; não pode conter credenciais ou tokens.
3. Acrescente `public/maps` ao `.vercelignore` para upload CLI. Para importação Git, mantenha os GLBs fora do repositório remoto.
4. Use `npm run build:remote` como comando de build. Ele exige a configuração externa e produz `dist` sem copiar os mapas locais.

A entrega local usa `/maps` e inclui as duas versões Meshopt sem perda; os originais estão preservados em ../original-maps. O repositório Git não inclui GLBs: ao cloná-lo, copie os mapas da entrega local para `public/maps/{mapId}/map.glb` ou configure `VITE_MAPS_BASE_URL` no ambiente adequado (.env.local para desenvolvimento; .env.production ou variável de build para produção). A alternativa externa depende de um destino de assets fornecido/configurado pelo responsável pelo deploy.

## Compressão dos mapas

Meshopt sem simplificação, quantização ou alteração de imagens: Tabajaras 70,01 → 43,23 MiB; Cantagalo 325,96 → 199,08 MiB. Economia total de 153,66 MiB. Os dados de todos os bufferViews foram verificados byte a byte após descompressão. O loader aceita originais e comprimidos; viewers externos precisam suportar EXT_meshopt_compression.

Detalhes em [docs/map-compression.md](docs/map-compression.md). O teste no navegador carregou ambos, preservou bounding boxes/triângulos, validou descarte de 1.693 texturas e concluiu a demo (322 frames/32,1 s) sem erros no console. A compressão reduz armazenamento/download; não reduz triângulos nem memória das texturas.

## Estrutura

- `config/maps.ts`: registro por mapId, metadata do PDF, transformação e calibração.
- `features/maps`, `features/twin`: carregamento serializado, descarte CPU/GPU, câmera, raycast e métricas.
- `features/mission`, `drone`, `incident`: planejamento, simulação, visão e comparação de recursos.
- `features/replay`, `services/persistence`: gravação imutável e histórico por mapa.
- `features/demo`: Scenario 01 configurável, orquestrando o controller compartilhado.
- `services/telemetry`: contrato de providers; fonte simulada, reprodução e preparação live.
- `CHECKPOINTS.md`: arquivos e validações por fase.

## Validação

Instalação limpa, TypeScript e build passaram; 19 testes automatizados em 9 arquivos passaram. Smoke test no build de produção: missão manual com 4 waypoints, voo de mais de 30 s, pausa/retomada, ocorrência, comparação de 3 recursos, gravação e replay de 526 frames/57,8 s. Os dois GLBs carregaram com isolamento e descarte verificados; Demo Scenario 01 concluiu automaticamente com 322 frames/32,1 s e console sem erros. Reinício e pausa/retomada no voo e Replay também concluíram (324 frames/53,5 s, incluindo a pausa). O build alternativo com URL de assets também passou (870 KB, sem GLBs).

## Limitações conhecidas

Escala métrica, orientação norte e datum de altitude permanecem pendentes; `fieldCalibrated=false`. Posições, velocidades e distâncias operacionais usam unidades locais. O offset BLOSM não é altitude absoluta. ETA é distância 3D/velocidade simulada, sem vias, obstáculos ou despacho automático. FOV/gimbal são ilustrativos.

Sessões encerradas ficam no IndexedDB deste navegador (até 10 por localidade). Aguarde a confirmação de salvamento antes de fechar. Gravações em andamento podem ser perdidas ao recarregar. Limpar os dados do navegador remove o histórico; não há sincronização entre dispositivos. Gravação limitada a 18.000 frames (~30 min a 10 Hz); trilha visual mostra até 10.000 pontos. Não há persistência remota, vídeo ou DJI real.

Cantagalo tem 3,05 milhões de triângulos e 1.693 texturas. Nesta máquina foram observados aproximadamente 25–37 FPS, conforme câmera/qualidade. O debug estima memória; não mede VRAM exata. Se necessário, selecione qualidade Econômica. O chunk 3D de aproximadamente 658 KB gera aviso de tamanho no build; é carregado somente após escolher um mapa.

## Integração real futura

Veja [BACKEND-CONTRACT.md](BACKEND-CONTRACT.md). Validar pontos de controle, escala, eixos e referência vertical por mapa; depois implementar o backend realtime e seu adaptador oficial DJI. Credenciais, MQTT e payload do fabricante ficam no servidor. O frontend deverá receber apenas o contrato normalizado, sem substituir campos desconhecidos por dados simulados. Confirmar equipamento, firmware, Pilot 2 e RTK na etapa de integração. Vídeo vem depois da validação de telemetria e georreferenciamento.

## Calibração horizontal (V1.1)

Abra uma localidade → Calibração → + Ponto de controle e clique na superfície. Preencha latitude/longitude WGS84 em graus decimais e a fonte real de cada ponto. Use pelo menos 3 pontos de ajuste não alinhados e pontos adicionais de verificação independente. O ajuste estima escala, rotação, translação e sinal do eixo Z, mostrando RMSE e resíduos por ponto. A configuração exportada explicita a fórmula.

Salvar rascunho grava apenas neste navegador, por mapId; use Carregar salvo ao retornar. Exporte JSON para backup ou transferência. A importação rejeita outro mapa ou referencial incompatível. Salve antes de trocar de mapa ou recarregar. Máximo: 20 pontos.

O candidato NÃO altera o mapa operacional. A projeção horizontal usa o elipsoide WGS84 (h=0 matemático, não altitude medida), limitada a 20 km da origem documentada. Não resolve inclinação, deformações locais ou datum vertical. Validação de campo e altitude continuam pendentes; RMSE baixo não certifica precisão. A origem e a transformação do modelo fazem parte da identificação do referencial do rascunho.

Validação desta etapa: 28 testes em 10 arquivos; TypeScript e build passaram. Navegador: captura de três pontos, salvar/carregar, ajuste com dados sintéticos explicitamente identificados e exportação/reimportação JSON passaram; console sem erros. Os dados sintéticos foram removidos da tela de teste.

## Histórico persistente

Ao encerrar a missão, a sessão é salva automaticamente no navegador. Após recarregar, abra a mesma localidade → Replay. O painel mostra o estado do armazenamento e permite exportar a sessão em JSON. Falhas de quota/permissão são sinalizadas; o replay permanece disponível em memória para exportação. A exportação é um backup estruturado; importação de sessões ainda não está disponível. Sessões antigas já perdidas antes desta versão não podem ser recuperadas.

Validação: 33 testes em 11 arquivos, TypeScript e build aprovados. Inclui isolamento por mapa, retenção, cópia imutável, restauração, gravação durante carregamento e tratamento de falhas de armazenamento.

Teste de navegador desta etapa: Demo Scenario 01 concluído (322 frames / 32,1 s), recarregamento completo, recuperação e abertura do replay, exportação JSON e Cantagalo sem sessões de Tabajaras. Console sem erros.

## Backend local e simulação remota

Em dois terminais, na pasta do projeto:

```sh
npm run backend
npm run dev:remote
```

Abra http://127.0.0.1:5177 e execute a demonstração. A rota é enviada ao servidor, que gera telemetria simulada; gravação e replay usam o fluxo existente. Sessões encerradas são gravadas em `server-data/`, com até 10 por localidade, preservadas ao reiniciar o servidor. Esse diretório é excluído do Git e do deploy do frontend. Faça backup do diretório para conservar os históricos.

`npm run dev` mantém o simulador e o histórico no navegador. `VITE_BACKEND_URL` configura o endereço público do backend (não é segredo); deixar vazio preserva o modo local. Os históricos do navegador e do servidor são separados, sem migração automática. A configuração remota vale para telemetria e sessões juntas.

Variáveis do servidor: `BACKEND_PORT` (8787), `SESSION_DATA_DIR`, `FRONTEND_ORIGINS` (origens permitidas separadas por vírgula) e `MAP_IDS` (tabajaras,cantagalo). Sem Supabase, o servidor escuta exclusivamente em 127.0.0.1. O modo público exige Supabase, login e origens HTTPS explicitamente configuradas. Veja CLOUD-DEPLOY.md para o caminho gratuito e os passos de ativação. O deploy atual da Vercel usa a API pública no Render com Supabase; o modo local continua disponível para desenvolvimento.

O transporte consulta HTTP sequencialmente, com intervalo de 100 ms após cada resposta; a taxa depende da latência. Não é WebSocket nem streaming DJI. Simulações sem acesso expiram após 2 minutos; perda de conexão sinaliza dados desatualizados. Uma simulação perdida exige iniciar uma nova sessão. Salvar exige servidor acessível; falhas mantêm o replay em memória para exportação. Não há sincronização instantânea de históricos entre abas; recarregue para consultar dados novos do servidor.

Validação: `npm test`, `npm run test:backend`, `npm run build`. O teste HTTP verifica reinício do servidor, retenção, isolamento, rejeição de origem indevida e comandos simulados. O navegador concluiu Demo Scenario 01 remoto com 258 frames / 32,1 s e console sem erros.

## Login e Supabase

O backend pode usar Supabase Auth e PostgreSQL. Cada usuário acessa apenas localidades explicitamente concedidas, e cada sessão pertence ao usuário que a gravou. Tokens ficam em memória, com renovação durante o uso; recarregar exige novo login. Sair encerra a gravação e aguarda o salvamento. Rascunhos de calibração também são separados por usuário no navegador. O catálogo público dos GLBs não é um controle de acesso aos arquivos de mapa já publicados.

Configuração gratuita e ativação: [CLOUD-DEPLOY.md](CLOUD-DEPLOY.md). O modo público recusa iniciar sem autenticação configurada. Não há chave service_role no aplicativo. Validação local inclui regras SQL em PostgreSQL via PGlite; a instalação no projeto Supabase DTT e o deploy real estão ativos. Consulte CLOUD-DEPLOY.md para os resultados da validação em produção.
