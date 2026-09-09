routerAdd('GET', '/backend/v1/health', (e) => {
  return e.json(200, {
    status: 'ok',
    system: 'Controle Preditiva',
    timestamp: new Date().toISOString(),
  })
})
