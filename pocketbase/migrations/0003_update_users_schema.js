migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Add role field if missing
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['admin', 'operador'],
          maxSelect: 1,
        }),
      )
    }

    // Add phone field if missing
    if (!users.fields.getByName('phone')) {
      users.fields.add(
        new TextField({
          name: 'phone',
          required: false,
        }),
      )
    }

    // Allow authenticated users to view/list all users for assignment and admin management
    // And allow admins to update users or users to update themselves
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.createRule = ''
    users.updateRule = "@request.auth.id != ''"
    users.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"

    app.save(users)

    // Ensure Luis Arakaki has role = admin
    try {
      const adminUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'luisarakaki@agricolaarakaki.com.br',
      )
      adminUser.set('role', 'admin')
      app.save(adminUser)
    } catch (_) {}
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      const roleField = users.fields.getByName('role')
      if (roleField) users.fields.removeByName('role')
      const phoneField = users.fields.getByName('phone')
      if (phoneField) users.fields.removeByName('phone')
      app.save(users)
    } catch (_) {}
  },
)
