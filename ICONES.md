# Ícones PWA

Para o PWA funcionar perfeitamente, você precisa adicionar os ícones na pasta `public/`:

## Ícones necessários:

1. **favicon.ico** (32x32 ou 16x16)
2. **pwa-192x192.png** (192x192)
3. **pwa-512x512.png** (512x512)
4. **apple-touch-icon.png** (180x180)

## Como criar os ícones:

### Opção 1: Online (Rápido)
1. Acesse: https://realfavicongenerator.net/
2. Faça upload de uma imagem/logo da sua patota
3. Clique em "Generate favicons"
4. Baixe o pacote
5. Extraia os arquivos na pasta `public/`

### Opção 2: Ferramenta local
1. Crie uma imagem 512x512 com o logo da patota
2. Use ImageMagick para gerar os tamanhos:
```bash
convert logo.png -resize 192x192 pwa-192x192.png
convert logo.png -resize 512x512 pwa-512x512.png
convert logo.png -resize 180x180 apple-touch-icon.png
convert logo.png -resize 32x32 favicon.ico
```

### Opção 3: Design simples
Se não tiver logo ainda, crie ícones com as iniciais "CCC" em:
- https://www.canva.com (gratuito)
- Figma (gratuito)
- Photoshop/GIMP

## Sugestão de design:
- Fundo: Verde (#10b981 - emerald-600)
- Texto: Branco "CCC" em negrito
- Estilo: Simples e reconhecível

## Após adicionar os ícones:
1. Coloque todos na pasta `public/`
2. Faça rebuild: `npm run build`
3. Faça novo deploy no Cloudflare
4. Teste a instalação do PWA no celular

Os ícones são importantes para:
- Aparecer bonito na tela inicial do celular
- Identificação fácil do app
- Experiência profissional
