Ferramentas YouTube — Museu Digital Rozenblit

Arquivos:
- gerar_track_ids.py
- buscar_youtube.py

1) Gerar track IDs:

python gerar_track_ids.py

ou:

python gerar_track_ids.py --catalogo catalogo.json --fichas fichas.json --saida fichas_atualizado.json

2) Buscar vídeos no YouTube:

Antes, configure a chave da API oficial do YouTube Data API v3.

PowerShell:
$env:YOUTUBE_API_KEY="SUA_CHAVE_AQUI"

CMD:
set YOUTUBE_API_KEY=SUA_CHAVE_AQUI

Linux/Mac:
export YOUTUBE_API_KEY="SUA_CHAVE_AQUI"

Rodar:

python buscar_youtube.py

Teste com poucas faixas:

python buscar_youtube.py --limite 20

Resultado:
- youtube.json
