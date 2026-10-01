migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('equipamentos')

    // Modificar campos existentes que antes eram required para torná-los opcionais
    // para permitir importação com dados da planilha que não possuem 'nome', 'setor', 'tipo', 'status'
    const nomeField = col.fields.getByName('nome')
    if (nomeField) {
      nomeField.required = false
    }

    const setorField = col.fields.getByName('setor')
    if (setorField) {
      setorField.required = false
    }

    const tipoField = col.fields.getByName('tipo')
    if (tipoField) {
      tipoField.required = false
    }

    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.required = false
    }

    // Novos campos solicitados da planilha:
    // 1. descricao (Descrição do MIS)
    if (!col.fields.getByName('descricao')) {
      col.fields.add(
        new TextField({
          name: 'descricao',
          required: false,
        }),
      )
    }

    // 2. codigo_equipamento (Código Equipamento)
    if (!col.fields.getByName('codigo_equipamento')) {
      col.fields.add(
        new TextField({
          name: 'codigo_equipamento',
          required: false,
        }),
      )
    }

    // 3. codigo_mis (Código do MIS)
    if (!col.fields.getByName('codigo_mis')) {
      col.fields.add(
        new TextField({
          name: 'codigo_mis',
          required: false,
        }),
      )
    }

    // 4. familia_codigo (Código da Família)
    if (!col.fields.getByName('familia_codigo')) {
      col.fields.add(
        new TextField({
          name: 'familia_codigo',
          required: false,
        }),
      )
    }

    // 5. familia_descricao (Descrição da Família)
    if (!col.fields.getByName('familia_descricao')) {
      col.fields.add(
        new TextField({
          name: 'familia_descricao',
          required: false,
        }),
      )
    }

    // 6. sensores (booleano: Sim/Não) - NUNCA required=true em BoolField
    if (!col.fields.getByName('sensores')) {
      col.fields.add(
        new BoolField({
          name: 'sensores',
          required: false,
        }),
      )
    }

    // 7. responsavel (texto)
    if (!col.fields.getByName('responsavel')) {
      col.fields.add(
        new TextField({
          name: 'responsavel',
          required: false,
        }),
      )
    }

    // Adicionar índices úteis para busca
    col.addIndex('idx_equip_codigo_equipamento', false, 'codigo_equipamento', '')
    col.addIndex('idx_equip_familia_codigo', false, 'familia_codigo', '')
    col.addIndex('idx_equip_responsavel', false, 'responsavel', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('equipamentos')
    col.removeIndex('idx_equip_codigo_equipamento')
    col.removeIndex('idx_equip_familia_codigo')
    col.removeIndex('idx_equip_responsavel')

    const toRemove = [
      'descricao',
      'codigo_equipamento',
      'codigo_mis',
      'familia_codigo',
      'familia_descricao',
      'sensores',
      'responsavel',
    ]

    for (const name of toRemove) {
      const field = col.fields.getByName(name)
      if (field) {
        col.fields.removeByName(name)
      }
    }

    app.save(col)
  },
)
