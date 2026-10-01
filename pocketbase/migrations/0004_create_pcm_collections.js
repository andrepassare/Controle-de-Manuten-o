migrate(
  (app) => {
    // 1. Equipamentos
    const equipamentos = new Collection({
      name: 'equipamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'tag', type: 'text', required: true },
        { name: 'setor', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'Mecânico',
            'Elétrico',
            'Hidráulico',
            'Pneumático',
            'Instrumentação',
            'Automação',
            'Outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Operacional', 'Em Manutenção', 'Alerta', 'Parado'],
          maxSelect: 1,
        },
        { name: 'criticidade', type: 'select', values: ['A', 'B', 'C'], maxSelect: 1 },
        { name: 'fabricante', type: 'text' },
        { name: 'modelo', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_equip_tag ON equipamentos (tag)',
        'CREATE INDEX idx_equip_setor ON equipamentos (setor)',
        'CREATE INDEX idx_equip_status ON equipamentos (status)',
      ],
    })
    app.save(equipamentos)

    // 2. Equipes
    const equipes = new Collection({
      name: 'equipes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'especialidade',
          type: 'select',
          required: true,
          values: [
            'Mecânica',
            'Elétrica',
            'Preditiva',
            'Instrumentação',
            'Caldeiraria',
            'Lubrificação',
            'Geral',
          ],
          maxSelect: 1,
        },
        { name: 'lider', type: 'text' },
        { name: 'integrantes', type: 'text' },
        {
          name: 'turno',
          type: 'select',
          values: ['Turno A (Manhã)', 'Turno B (Tarde)', 'Turno C (Noite)', 'Administrativo'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_equipes_nome ON equipes (nome)'],
    })
    app.save(equipes)

    // 3. Convites (Invites)
    // list/view for admins or public view by token so registration page can validate
    const convites = new Collection({
      name: 'convites',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: '', // Public can view so registration token check works
      createRule: "@request.auth.id != ''",
      updateRule: '', // Can be marked as used during registration
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'token', type: 'text', required: true },
        { name: 'role', type: 'select', values: ['admin', 'operador'], maxSelect: 1 },
        { name: 'expira_em', type: 'date', required: true },
        { name: 'usado', type: 'bool' },
        { name: 'usado_em', type: 'date' },
        { name: 'criado_por', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_convites_token ON convites (token)',
        'CREATE INDEX idx_convites_email ON convites (email)',
      ],
    })
    app.save(convites)

    // 4. Ordens de Serviço (OS)
    const equipCol = app.findCollectionByNameOrId('equipamentos')
    const equipesCol = app.findCollectionByNameOrId('equipes')

    const ordens = new Collection({
      name: 'ordens_servico',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'numero', type: 'text', required: true },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberta', 'em_andamento', 'fechada', 'cancelada'],
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: [
            'Mecânica',
            'Elétrica',
            'Instrumentação',
            'Lubrificação',
            'Caldeiraria',
            'Civil',
            'Automação',
            'Geral',
          ],
          maxSelect: 1,
        },
        {
          name: 'modalidade',
          type: 'select',
          required: true,
          values: [
            'Preditiva',
            'Preventiva',
            'Corretiva Programada',
            'Corretiva Emergencial',
            'Melhoria',
            'Inspeção',
          ],
          maxSelect: 1,
        },
        {
          name: 'prioridade',
          type: 'select',
          values: ['Baixa', 'Média', 'Alta', 'Urgente'],
          maxSelect: 1,
        },
        {
          name: 'equipamento_id',
          type: 'relation',
          collectionId: equipCol.id,
          maxSelect: 1,
        },
        {
          name: 'equipe_id',
          type: 'relation',
          collectionId: equipesCol.id,
          maxSelect: 1,
        },
        { name: 'responsavel', type: 'text' },
        { name: 'data_abertura', type: 'date' },
        { name: 'data_fechamento', type: 'date' },
        { name: 'tempo_execucao_horas', type: 'number' },
        { name: 'custo_estimado', type: 'number' },
        { name: 'observacoes_fechamento', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_os_numero ON ordens_servico (numero)',
        'CREATE INDEX idx_os_status ON ordens_servico (status)',
        'CREATE INDEX idx_os_categoria ON ordens_servico (categoria)',
        'CREATE INDEX idx_os_modalidade ON ordens_servico (modalidade)',
      ],
    })
    app.save(ordens)
  },
  (app) => {
    try {
      const ordens = app.findCollectionByNameOrId('ordens_servico')
      app.delete(ordens)
    } catch (_) {}
    try {
      const convites = app.findCollectionByNameOrId('convites')
      app.delete(convites)
    } catch (_) {}
    try {
      const equipes = app.findCollectionByNameOrId('equipes')
      app.delete(equipes)
    } catch (_) {}
    try {
      const equipamentos = app.findCollectionByNameOrId('equipamentos')
      app.delete(equipamentos)
    } catch (_) {}
  },
)
