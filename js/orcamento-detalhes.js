const folha = document.getElementById('folha');

function formatarData(iso) {
  if (!iso) return '—';
  return iso.substring(0, 10).split('-').reverse().join('/');
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—';
  return 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
}

async function carregarOrcamento() {
  const id = localStorage.getItem('orcamentoSelecionadoId');

  if (!id) {
    folha.innerHTML = '<p class="doc-carregando">Nenhum orçamento selecionado.</p>';
    return;
  }

  const [{ data: orc, error: errOrc }, { data: itens, error: errItens }] = await Promise.all([
    supabaseClient
      .from('orcamento')
      .select('orcamentoid, dt_orcamento, dt_validade_orcamento, vl_total_orcamento, cliente(clienteid, nome_cliente, cpf_cnpj_cliente, tipo_cliente)')
      .eq('orcamentoid', id)
      .single(),
    supabaseClient
      .from('orcamento_item')
      .select('orcamentoitemid, produtoid, produtodesc, qt_produto, vl_unitario, vl_total')
      .eq('orcamentoid', id)
      .order('orcamentoitemid', { ascending: true })
  ]);

  if (errOrc || !orc) {
    folha.innerHTML = '<p class="doc-carregando">Erro ao carregar orçamento.</p>';
    return;
  }

  const cliente = orc.cliente || {};

  let linhasItens = '';
  if (itens && itens.length > 0) {
    itens.forEach(function (item) {
      linhasItens +=
        '<tr>' +
          '<td>' + (item.produtodesc || '—') + '</td>' +
          '<td>' + (item.descricao ? item.descricao : '') + '</td>' +
          '<td>' + (item.qt_produto || 0) + '</td>' +
          '<td>' + formatarMoeda(item.vl_unitario) + '</td>' +
          '<td>' + formatarMoeda(item.vl_total) + '</td>' +
        '</tr>';
    });
  } else {
    linhasItens = '<tr><td colspan="5" style="text-align:center;color:#888;font-style:italic;padding:20px">Nenhum item encontrado.</td></tr>';
  }

  const tipoCliente = cliente.tipo_cliente === 'F' ? 'Pessoa Física'
                    : cliente.tipo_cliente === 'J' ? 'Pessoa Jurídica'
                    : '';

  const infoCliente = [
    cliente.nome_cliente || '—',
    tipoCliente,
    cliente.cpf_cnpj_cliente || ''
  ].filter(Boolean).join(' &nbsp;|&nbsp; ');

  folha.innerHTML =
    '<div class="doc-cabecalho">' +
      '<div style="border-radius:6px;padding:6px 10px;display:inline-block;">' +
        '<img src="assets/logo.png" alt="SCP" style="height:48px;display:block;" />' +
      '</div>' +
      '<div class="doc-titulo-bloco">' +
        '<div class="doc-titulo">Orçamento N&ordm; ' + orc.orcamentoid + '</div>' +
        '<div class="doc-datas">' +
          'Emiss&atilde;o: ' + formatarData(orc.dt_orcamento) + '<br/>' +
          'Validade: ' + formatarData(orc.dt_validade_orcamento) +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="doc-secao">' +
      '<div class="doc-secao-titulo">Cliente</div>' +
      '<div class="doc-secao-corpo">' + infoCliente + '</div>' +
    '</div>' +

    '<div class="doc-secao">' +
      '<div class="doc-secao-titulo">Itens do Or&ccedil;amento</div>' +
      '<table class="tabela-itens">' +
        '<thead>' +
          '<tr>' +
            '<th>Produto</th>' +
            '<th>Descri&ccedil;&atilde;o</th>' +
            '<th>Qtd</th>' +
            '<th>Valor Unit&aacute;rio</th>' +
            '<th>Valor Total</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + linhasItens + '</tbody>' +
      '</table>' +
    '</div>' +

    '<div class="doc-rodape">' +
      '<div class="doc-total-destaque">' +
        '<div class="doc-total-label">Valor Total do Or&ccedil;amento</div>' +
        '<div class="doc-total-valor">' + formatarMoeda(orc.vl_total_orcamento) + '</div>' +
      '</div>' +
    '</div>';
}

carregarOrcamento();
