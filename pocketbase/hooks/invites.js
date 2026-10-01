// Endpoint to generate an invite and attempt email sending or fallback to copyable link
routerAdd(
  'POST',
  '/backend/v1/invites',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado' })
    }

    // Ensure caller is admin
    const userRole = authRecord.getString('role')
    if (userRole !== 'admin') {
      return e.json(403, { error: 'Apenas administradores podem enviar convites' })
    }

    const body = e.requestInfo().body || {}
    const email = (body.email || '').trim().toLowerCase()
    const role = body.role === 'admin' ? 'admin' : 'operador'

    if (!email || !email.includes('@')) {
      return e.json(400, { error: 'E-mail inválido' })
    }

    // Check if a user already exists with this email
    try {
      const existingUser = $app.findAuthRecordByEmail('_pb_users_auth_', email)
      if (existingUser) {
        return e.json(400, { error: 'Já existe um usuário cadastrado com este e-mail' })
      }
    } catch (_) {}

    // Generate unique token
    const token = $security.randomString(32)
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const convitesCol = $app.findCollectionByNameOrId('convites')
    const record = new Record(convitesCol)
    record.set('email', email)
    record.set('token', token)
    record.set('role', role)
    record.set('expira_em', expiraEm)
    record.set('usado', false)
    record.set('criado_por', authRecord.getString('name') || authRecord.getString('email'))

    $app.save(record)

    // Construct invite URL
    let siteUrl = $os.getenv('SITE_URL') || ''
    if (!siteUrl) {
      siteUrl = e.requestInfo().headers['origin'] || ''
    }
    if (siteUrl.endsWith('/')) {
      siteUrl = siteUrl.slice(0, -1)
    }
    const inviteUrl = siteUrl ? siteUrl + '/cadastro/' + token : '/cadastro/' + token

    let emailSent = false
    let emailError = ''

    // Best effort email sending using PocketBase mailer
    try {
      const mailer = $app.newMailClient()
      const message = new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress || 'noreply@controlepreditiva.com',
          name: $app.settings().meta.senderName || 'Controle Preditiva',
        },
        to: [{ address: email }],
        subject: 'Convite para acesso ao Controle Preditiva',
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px;">
          <h2 style="color: #1E3A5F; margin-top: 0;">Você foi convidado para o Controle Preditiva</h2>
          <p style="color: #4A5568; line-height: 1.5;">
            Olá, um administrador convidou você para ingressar na plataforma de <strong>Controle Preditivo de Equipamentos & PCM</strong> com o papel de <strong>${role === 'admin' ? 'Administrador' : 'Operador'}</strong>.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${inviteUrl}" style="background-color: #1E3A5F; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Concluir Meu Cadastro
            </a>
          </div>
          <p style="color: #718096; font-size: 13px;">
            Ou acesse diretamente pelo link: <br />
            <a href="${inviteUrl}" style="color: #2A9D8F;">${inviteUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #EDF2F7; margin: 24px 0;" />
          <p style="color: #A0AEC0; font-size: 12px; margin: 0;">
            Este convite expira em 7 dias. Se você não solicitou este acesso, desconsidere esta mensagem.
          </p>
        </div>
      `,
      })
      mailer.send(message)
      emailSent = true
    } catch (err) {
      emailSent = false
      emailError = String(err)
    }

    return e.json(200, {
      success: true,
      invite: {
        id: record.id,
        email: email,
        role: role,
        token: token,
        expira_em: expiraEm,
        inviteUrl: inviteUrl,
        emailSent: emailSent,
        emailError: emailSent ? null : emailError,
      },
    })
  },
  $apis.requireAuth(),
)
