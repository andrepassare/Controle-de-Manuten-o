migrate(
  (app) => {
    const equipCol = app.findCollectionByNameOrId('equipamentos')
    const equipesCol = app.findCollectionByNameOrId('equipes')
    const ordensCol = app.findCollectionByNameOrId('ordens_servico')

    // 1. Seed Equipamentos
    const equipData = [
      {
        nome: 'Bomba Centrífuga de Alimentação',
        tag: 'BOM-0101',
        setor: 'Extração / Moenda',
        tipo: 'Mecânico',
        status: 'Operacional',
        criticidade: 'A',
        fabricante: 'KSB',
        modelo: 'MegaCPK 125-250',
        observacoes: 'Sensor de vibração triaxial instalado no mancais dianteiro e traseiro.',
      },
      {
        nome: 'Turbogerador a Vapor T-100',
        tag: 'TG-0201',
        setor: 'Geração de Energia / Termelétrica',
        tipo: 'Elétrico',
        status: 'Operacional',
        criticidade: 'A',
        fabricante: 'Siemens',
        modelo: 'SST-300',
        observacoes: 'Monitoramento contínuo de temperatura e vibração acoplamento.',
      },
      {
        nome: 'Redutor Planetário do Difusor',
        tag: 'RED-0104',
        setor: 'Difusão',
        tipo: 'Mecânico',
        status: 'Alerta',
        criticidade: 'A',
        fabricante: 'Flender',
        modelo: 'Planurex 3',
        observacoes: 'Análise de óleo recente apontou partículas ferrosas de desgaste leve.',
      },
      {
        nome: 'Compressor de Parafuso Isento de Óleo',
        tag: 'CMP-0302',
        setor: 'Utilidades',
        tipo: 'Pneumático',
        status: 'Operacional',
        criticidade: 'B',
        fabricante: 'Atlas Copco',
        modelo: 'ZR 160 VSD',
        observacoes: 'Manutenção preditiva termográfica realizada sem desvios.',
      },
      {
        nome: 'Motor Indução Trifásico 450kW',
        tag: 'MOT-0102',
        setor: 'Extração / Moenda',
        tipo: 'Elétrico',
        status: 'Em Manutenção',
        criticidade: 'A',
        fabricante: 'WEG',
        modelo: 'W22 Magnet 450kW',
        observacoes: 'Substituição programada do rolamento lado acoplado.',
      },
      {
        nome: 'Válvula Reguladora de Pressão Vapor',
        tag: 'VAL-0401',
        setor: 'Caldeiras',
        tipo: 'Instrumentação',
        status: 'Operacional',
        criticidade: 'B',
        fabricante: 'Samson',
        modelo: '3241-1',
        observacoes: 'Calibração e testes de resposta OK.',
      },
      {
        nome: 'Ventilador de Tiragem Forçada Caldeira 2',
        tag: 'VTF-0402',
        setor: 'Caldeiras',
        tipo: 'Mecânico',
        status: 'Parado',
        criticidade: 'B',
        fabricante: 'Howden',
        modelo: 'VARIAX 1800',
        observacoes: 'Aguardando alinhamento a laser e balanceamento dinâmico.',
      },
      {
        nome: 'Unidade Hidráulica do Picador',
        tag: 'UHD-0105',
        setor: 'Recepção de Cana',
        tipo: 'Hidráulico',
        status: 'Operacional',
        criticidade: 'B',
        fabricante: 'Bosch Rexroth',
        modelo: 'ABPAC-300',
        observacoes: 'Pressão de trabalho estabilizada em 210 bar.',
      },
    ]

    const createdEquips = []
    for (const item of equipData) {
      let rec
      try {
        rec = app.findFirstRecordByData('equipamentos', 'tag', item.tag)
      } catch (_) {
        rec = new Record(equipCol)
        for (const k in item) {
          rec.set(k, item[k])
        }
        app.save(rec)
      }
      createdEquips.push(rec)
    }

    // 2. Seed Equipes
    const equipesData = [
      {
        nome: 'Equipe Preditiva & Diagnóstico',
        especialidade: 'Preditiva',
        lider: 'Eng. Carlos Eduardo Ramos',
        integrantes: 'Carlos Eduardo, Marcos Rocha, Aline Souza, Felipe Santos',
        turno: 'Administrativo',
        descricao:
          'Responsável por análise de vibração, termografia infravermelha, análise de óleo e ultrassom acústico.',
      },
      {
        nome: 'Equipe Mecânica Industrial A',
        especialidade: 'Mecânica',
        lider: 'Roberto Alencar',
        integrantes: 'Roberto Alencar, Diego Martins, Gilberto Silva, Paulo Nogueira',
        turno: 'Turno A (Manhã)',
        descricao:
          'Intervenções mecânicas em redutores, bombas, esteiras e mancais da moenda e difusor.',
      },
      {
        nome: 'Equipe Eletroeletrônica & Automação',
        especialidade: 'Elétrica',
        lider: 'Mariana Prado',
        integrantes: 'Mariana Prado, Lucas Mendes, Renan Castro, Tatiane Lima',
        turno: 'Turno B (Tarde)',
        descricao:
          'Painéis elétricos, inversores de frequência, PLC, sensores e instrumentação de campo.',
      },
      {
        nome: 'Equipe de Lubrificação & Tribologia',
        especialidade: 'Lubrificação',
        lider: 'Valdemir Cardoso',
        integrantes: 'Valdemir Cardoso, Anderson Ramos, José Pereira',
        turno: 'Turno A (Manhã)',
        descricao:
          'Rotas diárias de lubrificação, coleta de amostras e filtragem offline de óleo hidráulico.',
      },
    ]

    const createdEquipes = []
    for (const item of equipesData) {
      let rec
      try {
        rec = app.findFirstRecordByData('equipes', 'nome', item.nome)
      } catch (_) {
        rec = new Record(equipesCol)
        for (const k in item) {
          rec.set(k, item[k])
        }
        app.save(rec)
      }
      createdEquipes.push(rec)
    }

    // 3. Seed Ordens de Serviço
    const osData = [
      {
        numero: 'OS-2026-001',
        titulo: 'Análise de vibração no mancal dianteiro da Bomba BOM-0101',
        descricao:
          'Coleta espectral periódica. Identificado pico em 1X e harmônicos característicos de desalinhamento angular leve.',
        status: 'fechada',
        categoria: 'Mecânica',
        modalidade: 'Preditiva',
        prioridade: 'Alta',
        equipIndex: 0,
        equipeIndex: 0,
        responsavel: 'Carlos Eduardo Ramos',
        data_abertura: '2026-09-10 08:30:00.000Z',
        data_fechamento: '2026-09-12 14:00:00.000Z',
        tempo_execucao_horas: 3.5,
        custo_estimado: 450,
        observacoes_fechamento: 'Alinhamento conferido e vibração retornou à zona A da ISO 10816.',
      },
      {
        numero: 'OS-2026-002',
        titulo: 'Inspeção termográfica nos barramentos do Turbogerador TG-0201',
        descricao:
          'Verificação de aquecimento anômalo nos terminais de conexão do gerador durante regime de carga máxima (95% MWe).',
        status: 'fechada',
        categoria: 'Elétrica',
        modalidade: 'Preditiva',
        prioridade: 'Média',
        equipIndex: 1,
        equipeIndex: 0,
        responsavel: 'Aline Souza',
        data_abertura: '2026-09-14 10:00:00.000Z',
        data_fechamento: '2026-09-14 16:30:00.000Z',
        tempo_execucao_horas: 2.0,
        custo_estimado: 200,
        observacoes_fechamento:
          'Gradiente térmico dentro do tolerável (delta T < 3°C entre fases).',
      },
      {
        numero: 'OS-2026-003',
        titulo: 'Substituição do rolamento motor indução 450kW (MOT-0102)',
        descricao:
          'Intervenção corretiva programada com base em envelope de aceleração da equipe preditiva.',
        status: 'em_andamento',
        categoria: 'Mecânica',
        modalidade: 'Corretiva Programada',
        prioridade: 'Alta',
        equipIndex: 4,
        equipeIndex: 1,
        responsavel: 'Roberto Alencar',
        data_abertura: '2026-09-28 07:00:00.000Z',
        data_fechamento: null,
        tempo_execucao_horas: 6.0,
        custo_estimado: 3200,
        observacoes_fechamento: '',
      },
      {
        numero: 'OS-2026-004',
        titulo: 'Coleta e análise de óleo lubrificante Redutor Difusor RED-0104',
        descricao:
          'Análise físico-química e contagem de partículas (ISO 4406). Investigar indícios de contaminação.',
        status: 'aberta',
        categoria: 'Lubrificação',
        modalidade: 'Preditiva',
        prioridade: 'Média',
        equipIndex: 2,
        equipeIndex: 3,
        responsavel: 'Valdemir Cardoso',
        data_abertura: '2026-09-29 09:00:00.000Z',
        data_fechamento: null,
        tempo_execucao_horas: null,
        custo_estimado: 580,
        observacoes_fechamento: '',
      },
      {
        numero: 'OS-2026-005',
        titulo: 'Balanceamento dinâmico em campo do Ventilador VTF-0402',
        descricao:
          'Equipamento parou devido a alarme de vibração na tela de supervisão. Realizar balanceamento de 2 planos.',
        status: 'aberta',
        categoria: 'Mecânica',
        modalidade: 'Corretiva Emergencial',
        prioridade: 'Urgente',
        equipIndex: 6,
        equipeIndex: 0,
        responsavel: 'Marcos Rocha',
        data_abertura: '2026-09-30 11:15:00.000Z',
        data_fechamento: null,
        tempo_execucao_horas: null,
        custo_estimado: 1500,
        observacoes_fechamento: '',
      },
      {
        numero: 'OS-2026-006',
        titulo: 'Calibração e loop test da Válvula Reguladora VAL-0401',
        descricao:
          'Plano semestral de instrumentação do sistema de caldeiras. Ajuste fino de posicionador Hart.',
        status: 'fechada',
        categoria: 'Instrumentação',
        modalidade: 'Preventiva',
        prioridade: 'Baixa',
        equipIndex: 5,
        equipeIndex: 2,
        responsavel: 'Mariana Prado',
        data_abertura: '2026-09-18 13:00:00.000Z',
        data_fechamento: '2026-09-18 17:00:00.000Z',
        tempo_execucao_horas: 4.0,
        custo_estimado: 350,
        observacoes_fechamento: 'Tempo de resposta aferido em 1.8s. Linearidade OK.',
      },
      {
        numero: 'OS-2026-007',
        titulo: 'Revisão e limpeza de filtros do Compressor Atlas Copco CMP-0302',
        descricao: 'Plano preventivo de 2.000 horas do compressor de utilidades da planta.',
        status: 'fechada',
        categoria: 'Mecânica',
        modalidade: 'Preventiva',
        prioridade: 'Média',
        equipIndex: 3,
        equipeIndex: 1,
        responsavel: 'Diego Martins',
        data_abertura: '2026-09-22 08:00:00.000Z',
        data_fechamento: '2026-09-22 12:30:00.000Z',
        tempo_execucao_horas: 4.5,
        custo_estimado: 890,
        observacoes_fechamento: 'Filtros de admissão e óleo trocados com sucesso.',
      },
      {
        numero: 'OS-2026-008',
        titulo: 'Ultrassom acústico para detecção de vazamentos na Unidade Hidráulica UHD-0105',
        descricao:
          'Inspeção preditiva acústica de alta frequência nos blocos manípulos e conexões de alta pressão.',
        status: 'aberta',
        categoria: 'Geral',
        modalidade: 'Preditiva',
        prioridade: 'Baixa',
        equipIndex: 7,
        equipeIndex: 0,
        responsavel: 'Felipe Santos',
        data_abertura: '2026-10-01 10:00:00.000Z',
        data_fechamento: null,
        tempo_execucao_horas: null,
        custo_estimado: 180,
        observacoes_fechamento: '',
      },
    ]

    for (const item of osData) {
      try {
        app.findFirstRecordByData('ordens_servico', 'numero', item.numero)
      } catch (_) {
        const rec = new Record(ordensCol)
        rec.set('numero', item.numero)
        rec.set('titulo', item.titulo)
        rec.set('descricao', item.descricao)
        rec.set('status', item.status)
        rec.set('categoria', item.categoria)
        rec.set('modalidade', item.modalidade)
        rec.set('prioridade', item.prioridade)
        if (createdEquips[item.equipIndex]) {
          rec.set('equipamento_id', createdEquips[item.equipIndex].id)
        }
        if (createdEquipes[item.equipeIndex]) {
          rec.set('equipe_id', createdEquipes[item.equipeIndex].id)
        }
        rec.set('responsavel', item.responsavel)
        rec.set('data_abertura', item.data_abertura)
        if (item.data_fechamento) {
          rec.set('data_fechamento', item.data_fechamento)
        }
        if (item.tempo_execucao_horas) {
          rec.set('tempo_execucao_horas', item.tempo_execucao_horas)
        }
        if (item.custo_estimado) {
          rec.set('custo_estimado', item.custo_estimado)
        }
        rec.set('observacoes_fechamento', item.observacoes_fechamento)
        app.save(rec)
      }
    }
  },
  (app) => {
    // down: nothing mandatory to delete
  },
)
