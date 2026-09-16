# Pendências para integração real

## Georreferenciamento — retomar antes de habilitar telemetria real

Solicitação do proprietário: manter esta validação pendente visível enquanto a plataforma simulada evolui.

- As origens e bounds de Tabajaras e Cantagalo já estão documentados no PDF V6 e configurados em src/config/maps.ts. Não pedir novamente a localização central.
- Os valores documentados vieram das propriedades BLOSM dos arquivos .blend. Não presumir que estão embutidos nos GLBs.
- Confirmar por localidade a escala efetiva, a orientação norte/leste e a transformação entre coordenadas locais e geográficas.
- Comparar pontos identificáveis do modelo com coordenadas de referência, registrando fonte e precisão; usar pontos independentes para conferência.
- Validar referência vertical separadamente. sourceHeightOffset não é altitude absoluta do drone.
- Manter fieldCalibrated=false e campos desconhecidos pendentes até validação documentada. Não liberar posicionamento operacional real com base apenas no centro/bounds.

A simulação pode continuar. Não integrar o DJI real nesta etapa.

## Compatibilidade de navegador

- Brave: proprietário relatou falha de conexão com o backend, enquanto outro navegador funcionou. Causa ainda não confirmada; retomar diagnóstico posteriormente conforme solicitado. Não desativar proteções do navegador automaticamente.
