# Mapas comprimidos

| Mapa | Original | Meshopt | Redução | Triângulos |
|---|---:|---:|---:|---:|
| Tabajaras | 70,01 MiB | 43,23 MiB | 38,25% | 670.916 |
| Cantagalo | 325,96 MiB | 199,08 MiB | 38,93% | 3.047.370 |

Compressão sem perda, sem Decimate, quantização ou recompressão de imagens. Todos os 10.039 bufferViews foram reabertos, descomprimidos e comparados byte a byte com os originais; metadados e transformações preservados. O loader inclui MeshoptDecoder.

Os arquivos são distribuídos separadamente do Git. Devem ficar em `public/maps/tabajaras/map.glb` e `public/maps/cantagalo/map.glb`, ou num servidor de assets configurado por `VITE_MAPS_BASE_URL`, preservando os mesmos caminhos relativos. Habilite CORS para o domínio da aplicação.

SHA-256 das versões comprimidas:
- Tabajaras: b507daf35e77c452427055abfb849695b6df871cf69cb9de2d26167d7de80cba
- Cantagalo: 19c54d0005239f7c5cc4822934aae30519651d2c95a4c8427ac16d775a899fef

Para reproduzir com os originais disponíveis, execute `node scripts/compress-maps.mjs caminho-original.glb caminho-comprimido.glb`. Nunca use o mesmo caminho de entrada e saída. Os relatórios JSON incluem hashes e verificações. Compressão reduz armazenamento/download; não reduz a quantidade de triângulos nem memória de texturas.
