# Escala de viewport (TV = MacBook)

Em landscape o app é o canvas 1440x810 a 17px, escalado pelo plugin
`plugins/viewport-scale.client.ts` (font-size do <html> + --app-vh/--header-h/--footer-h em px).
Tailwind sm..xl sempre valem em landscape, igual ao notebook; em pé são por largura (tailwind.config.ts).

Regras:
- Sem @media de largura/altura para landscape. Corrija o componente (rem, flex-1, min-h-0).
  Única exceção: celular deitado, `(orientation: landscape) and (max-height: 500px) and (pointer: coarse)`.
- Sem px/vh/vw/clamp em tamanhos. Use rem.
- Para mudar o tamanho em TODAS as telas: BASE_FONT em utils/viewportScale.ts.
