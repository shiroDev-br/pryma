import { io, Socket } from 'socket.io-client'

export default defineNuxtPlugin(() => {
  // Configura a URL do seu servidor socket
  const socket: Socket = io('http://localhost:3000', {
    autoConnect: false // Evita conectar antes da hora se preferir
  })

  // Conecta apenas no cliente
  if (import.meta.client) {
    socket.connect()
  }

  // Disponibiliza o socket globalmente no Nuxt
  return {
    provide: {
      socket: socket
    }
  }
})
