# Escala de viewport (TV = MacBook)

Em landscape o app é o canvas 1440x810 a 17px, escalado pelo plugin
`plugins/viewport-scale.client.ts` (font-size do <html> + --app-vh/--header-h/--footer-h em px).
Tailwind sm..xl = 0px (tailwind.config.ts): as variantes sempre valem, igual ao notebook.

Regras:
- Sem @media de largura/altura para landscape. Corrija o componente (rem, flex-1, min-h-0).
- Sem px/vh/vw/clamp em tamanhos. Use rem.
- Para mudar o tamanho em TODAS as telas: BASE_FONT em utils/viewportScale.ts.
