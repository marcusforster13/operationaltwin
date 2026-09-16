# Telemetria futura — contrato interno

`TelemetryProvider` é a interface de consumo. `subscribeToMap` é usada pelo controller para Mock e Recorded e aceita também Live, sem mudar os componentes 3D. Comandos de simulação permanecem no Mock; não equivalem a comandos de aeronave.

`LiveTelemetryProvider` é um stub desligado na V1. Sem transporte configurado ou sem calibração validada, `connect()` rejeita com `LIVE PENDING`. Nenhum endpoint ou payload DJI foi presumido. A UI V1 oferece somente SIMULATION e RECORDED.

## Backend → frontend

Implementar `NormalizedTelemetryTransport` no futuro para o canal autenticado com nosso backend. Ele entrega objetos `DroneTelemetry`, filtrados por mapId:

- Obrigatórios: `mapId`, `droneId`, `timestamp` Unix em ms, `position: {x,y,z}` no referencial local calibrado e `connection` (`online`, `stale`, `offline`).
- `altitude`, `speed`, `heading` e `battery`: número ou `null` quando desconhecido. Ausentes viram `null`; não há valores simulados de substituição.
- `latitude`, `longitude`, `gimbal` e `state`: opcionais. Unidades/heading e referência vertical precisam coincidir com a configuração calibrada do mapa. A normalização de coordenadas fica no backend; latitude/longitude nunca viram X/Z diretamente.
- Payload inválido, mapId diferente ou timestamp regressivo é rejeitado com erro observável. Cancelamento desliga assinatura e transporte.

O servidor deve validar autorização por localidade/aeronave, administrar credenciais DJI/MQTT, normalizar o adaptador oficial e emitir o estado da conexão. O transporte futuro deve também notificar perda de conexão. Nenhum segredo pode ser `VITE_*` ou parte de uma URL pública.

## Antes de ativar Live

1. Levantar pelo menos 2–3 pontos de controle por mapa e documentar erro residual, escala e orientação norte/leste.
2. Validar transformação para o runtime e datum/offset vertical do drone. O `sourceHeightOffset` do PDF não substitui esta medição.
3. Configurar e revisar `metersPerUnit`, `northRotationY`, `altitudeDatum`, `altitudeReferenceValidated` e só então `fieldCalibrated`.
4. Conectar o provider à assinatura comum no controller, apresentar modo LIVE e dados ausentes explicitamente; manter os comandos Mock fora desse modo. Testar desconexão/stale, reconexão, isolamento e gravação antes de qualquer uso operacional.
5. Integrar vídeo/câmera apenas após telemetria e georreferenciamento validados.

Fixtures de calibração nos testes são artificiais e restritas aos testes; os registros reais continuam pendentes.

## Backend de desenvolvimento implementado

`server/index.mjs` fornece `/health`, `GET/PUT /maps/:mapId/sessions`, `POST /maps/:mapId/simulations`, `GET /maps/:mapId/simulations/:id` e `POST /maps/:mapId/simulations/:id/command`. Comandos aceitos: pause, resume, stop e gimbal (yaw/pitch). Rotas contêm somente pontos locais de simulação. Corpo JSON limitado a 16 MiB. O adaptador `RemoteSimulationProvider` valida os frames pelo mesmo normalizador interno e mantém o modo simulation. Live continua bloqueado pela calibração.

O modo sem Supabase é restrito ao computador local. O modo público exige Supabase Auth, permissões por localidade, origens HTTPS e o esquema SQL com isolamento por usuário. Login/refresh passam por /auth/login e /auth/refresh; os demais endpoints usam Bearer do usuário. Supabase valida o token, e as permissões ficam em cache por no máximo 30 s (nunca além da expiração do token). Sessões usam o token do próprio usuário; acesso anônimo ao banco e escrita direta nas tabelas são bloqueados. Nenhuma credencial DJI foi criada ou incorporada.
