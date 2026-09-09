migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const email = 'luisarakaki@agricolaarakaki.com.br'
    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      record = new Record(users)
    }

    record.setEmail(email)
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Luis Arakaki')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'luisarakaki@agricolaarakaki.com.br',
      )
      app.delete(record)
    } catch (_) {}
  },
)
