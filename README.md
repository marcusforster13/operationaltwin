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

Sessões ficam na memória da aba (até 10); recarregar perde o histórico. Gravação limitada a 18.000 frames (~30 min a 10 Hz); trilha visual mostra até 10.000 pontos. Não há persistência remota, vídeo ou DJI real.

Cantagalo tem 3,05 milhões de triângulos e 1.693 texturas. Nesta máquina foram observados aproximadamente 25–37 FPS, conforme câmera/qualidade. O debug estima memória; não mede VRAM exata. Se necessário, selecione qualidade Econômica. O chunk 3D de aproximadamente 658 KB gera aviso de tamanho no build; é carregado somente após escolher um mapa.

## Integração real futura

Veja [BACKEND-CONTRACT.md](BACKEND-CONTRACT.md). Validar pontos de controle, escala, eixos e referência vertical por mapa; depois implementar o backend realtime e seu adaptador oficial DJI. Credenciais, MQTT e payload do fabricante ficam no servidor. O frontend deverá receber apenas o contrato normalizado, sem substituir campos desconhecidos por dados simulados. Confirmar equipamento, firmware, Pilot 2 e RTK na etapa de integração. Vídeo vem depois da validação de telemetria e georreferenciamento.
