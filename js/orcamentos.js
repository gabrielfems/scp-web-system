/*
  =====================================================
  PEGANDO OS ELEMENTOS DO HTML
  =====================================================
*/

const clienteOrcamentoInput     = document.getElementById('clienteOrcamento');
const codigoOrcamentoInput      = document.getElementById('codigoOrcamento');
const dataOrcamentoInput        = document.getElementById('dataOrcamento');
const dataValidadeInput         = document.getElementById('dataValidade');
const mensagemOrcamento         = document.getElementById('mensagemOrcamento');
const produtoOrcamentoInput     = document.getElementById('produtoOrcamento');
const quantidadeItemInput       = document.getElementById('quantidadeItem');
const descricaoItemOrcInput     = document.getElementById('descricaoItemOrc');
const valorUnitarioItemInput    = document.getElementById('valorUnitarioItem');
const valorTotalItemOrcInput    = document.getElementById('valorTotalItemOrc');
const corpoTabelaItens          = document.getElementById('corpoTabelaItens');
const valorTotalOrcamentoEl     = document.getElementById('valorTotalOrcamento');

/*
  Estado em memória: lista de itens antes de gravar no banco.
*/
let itensOrcamento   = [];
let produtosCatalogo = [];
let dataOrcamentoISO = null;
let dataValidadeISO  = null;

/*
  =====================================================
  DATE PICKERS
  =====================================================
*/

const fpDataOrcamento = flatpickr(dataOrcamentoInput, {
  locale:     'pt',
  dateFormat: 'd/m/Y',
  allowInput: false,
  onChange: function (selectedDates) {
    if (selectedDates.length > 0) {
      dataOrcamentoISO = selectedDates[0].toISOString().substring(0, 10);
      dataOrcamentoInput.classList.remove('campo-invalido');
      mensagemOrcamento.textContent = '';
    }
  }
});

const fpDataValidade = flatpickr(dataValidadeInput, {
  locale:     'pt',
  dateFormat: 'd/m/Y',
  allowInput: false,
  onChange: function (selectedDates) {
    if (selectedDates.length > 0) {
      dataValidadeISO = selectedDates[0].toISOString().substring(0, 10);
      dataValidadeInput.classList.remove('campo-invalido');
      mensagemOrcamento.textContent = '';
    }
  }
});

clienteOrcamentoInput.addEventListener('change', function () {
  clienteOrcamentoInput.classList.remove('campo-invalido');
  mensagemOrcamento.textContent = '';
});

/*
  =====================================================
  CARREGA CLIENTES E PRODUTOS NOS SELECTS
  =====================================================
*/

async function carregarClientesParaOrcamento() {
  const { data } = await supabaseClient
    .from('cliente')
    .select('clienteid, nome_cliente')
    .order('nome_cliente', { ascending: true });

  if (!data) return;

  clienteOrcamentoInput.innerHTML = '<option value="">Selecione</option>';
  data.forEach(function (c) {
    const opt = document.createElement('option');
    opt.value       = c.clienteid;
    opt.textContent = c.nome_cliente;
    clienteOrcamentoInput.appendChild(opt);
  });
}

async function carregarProdutosParaOrcamento() {
  const { data } = await supabaseClient
    .from('produto')
    .select('produtoid, ds_produto, obs_produto, vl_venda_produto')
    .eq('status_produto', 'A')
    .order('ds_produto', { ascending: true });

  if (!data) return;

  produtosCatalogo = data;

  produtoOrcamentoInput.innerHTML = '<option value="">Selecione um produto</option>';
  data.forEach(function (p) {
    const opt = document.createElement('option');
    opt.value       = p.produtoid;
    opt.textContent = p.ds_produto;
    produtoOrcamentoInput.appendChild(opt);
  });
}

/*
  =====================================================
  BLOCO ADICIONAR ITEM
  =====================================================
*/

function preencherDadosProduto() {
  const produtoId = parseInt(produtoOrcamentoInput.value);
  const produto   = produtosCatalogo.find(function (p) { return p.produtoid === produtoId; });

  if (!produto) {
    descricaoItemOrcInput.value  = '';
    valorUnitarioItemInput.value = '';
    valorTotalItemOrcInput.value = '';
    return;
  }

  descricaoItemOrcInput.value  = produto.obs_produto || '—';
  valorUnitarioItemInput.value = 'R$ ' + parseFloat(produto.vl_venda_produto).toFixed(2).replace('.', ',');
  recalcularTotalItem();
}

function recalcularTotalItem() {
  const produtoId  = parseInt(produtoOrcamentoInput.value);
  const produto    = produtosCatalogo.find(function (p) { return p.produtoid === produtoId; });
  const quantidade = parseInt(quantidadeItemInput.value);

  if (produto && quantidade > 0) {
    const total = parseFloat(produto.vl_venda_produto) * quantidade;
    valorTotalItemOrcInput.value = 'R$ ' + total.toFixed(2).replace('.', ',');
  } else {
    valorTotalItemOrcInput.value = '';
  }
}

produtoOrcamentoInput.addEventListener('change', preencherDadosProduto);
quantidadeItemInput.addEventListener('input', recalcularTotalItem);

/*
  =====================================================
  TOTAIS E TABELA DE ITENS
  =====================================================
*/

function recalcularTotalOrcamento() {
  const total = itensOrcamento.reduce(function (soma, item) {
    return soma + item.vl_total_item;
  }, 0);

  const formatado = 'R$ ' + total.toFixed(2).replace('.', ',');
  valorTotalOrcamentoEl.textContent = formatado;
}

function renderizarTabelaItens() {
  corpoTabelaItens.innerHTML = '';

  if (itensOrcamento.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" class="tabela-vazia">Nenhum item adicionado.</td>';
    corpoTabelaItens.appendChild(tr);
    return;
  }

  itensOrcamento.forEach(function (item, index) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + item.nome + '</td>' +
      '<td>' + item.descricao + '</td>' +
      '<td>' + item.quantidade + '</td>' +
      '<td>R$ ' + parseFloat(item.vl_unitario).toFixed(2).replace('.', ',') + '</td>' +
      '<td>R$ ' + parseFloat(item.vl_total_item).toFixed(2).replace('.', ',') + '</td>' +
      '<td class="acoes-tabela">' +
        '<button class="btn-editar" onclick="editarItem(' + index + ')">Editar</button>' +
        '<button class="btn-excluir" onclick="removerItem(' + index + ')">Remover</button>' +
      '</td>';
    corpoTabelaItens.appendChild(tr);
  });
}

/*
  =====================================================
  AÇÕES DOS ITENS
  =====================================================
*/

function adicionarItem() {
  const produtoId  = parseInt(produtoOrcamentoInput.value);
  const quantidade = parseInt(quantidadeItemInput.value);
  const produto    = produtosCatalogo.find(function (p) { return p.produtoid === produtoId; });

  if (!produtoId || !produto) {
    produtoOrcamentoInput.classList.add('campo-invalido');
    return;
  }

  if (!quantidade || quantidade < 1) {
    quantidadeItemInput.classList.add('campo-invalido');
    return;
  }

  produtoOrcamentoInput.classList.remove('campo-invalido');
  quantidadeItemInput.classList.remove('campo-invalido');

  const vlUnitario     = parseFloat(produto.vl_venda_produto);
  const vlTotalItem    = vlUnitario * quantidade;
  const indexExistente = itensOrcamento.findIndex(function (i) { return i.produtoid === produtoId; });

  if (indexExistente >= 0) {
    itensOrcamento[indexExistente].quantidade    = quantidade;
    itensOrcamento[indexExistente].vl_total_item = vlUnitario * quantidade;
  } else {
    itensOrcamento.push({
      produtoid:     produtoId,
      nome:          produto.ds_produto,
      descricao:     produto.obs_produto || '—',
      quantidade:    quantidade,
      vl_unitario:   vlUnitario,
      vl_total_item: vlTotalItem
    });
  }

  renderizarTabelaItens();
  recalcularTotalOrcamento();
  limparFormItem();
}

function editarItem(index) {
  const item = itensOrcamento[index];
  produtoOrcamentoInput.value = item.produtoid;
  quantidadeItemInput.value   = item.quantidade;
  preencherDadosProduto();
  document.getElementById('secao-orcamentos').scrollIntoView({ behavior: 'smooth' });
}

function removerItem(index) {
  itensOrcamento.splice(index, 1);
  renderizarTabelaItens();
  recalcularTotalOrcamento();
}

function limparFormItem() {
  produtoOrcamentoInput.value  = '';
  quantidadeItemInput.value    = '';
  descricaoItemOrcInput.value  = '';
  valorUnitarioItemInput.value = '';
  valorTotalItemOrcInput.value = '';
}

/*
  =====================================================
  SALVAR ORÇAMENTO
  =====================================================
*/

async function salvarOrcamento() {
  mensagemOrcamento.textContent = '';

  const clienteId = parseInt(clienteOrcamentoInput.value);

  if (!clienteId) {
    clienteOrcamentoInput.classList.add('campo-invalido');
    mensagemOrcamento.textContent = 'Selecione um cliente.';
    return;
  }

  if (!dataOrcamentoISO) {
    dataOrcamentoInput.classList.add('campo-invalido');
    mensagemOrcamento.textContent = 'Informe a data do orçamento.';
    return;
  }

  if (!dataValidadeISO) {
    dataValidadeInput.classList.add('campo-invalido');
    mensagemOrcamento.textContent = 'Informe a data de validade.';
    return;
  }

  if (itensOrcamento.length === 0) {
    mensagemOrcamento.textContent = 'Adicione ao menos um item ao orçamento.';
    return;
  }

  const vlTotal = itensOrcamento.reduce(function (soma, item) {
    return soma + item.vl_total_item;
  }, 0);

  const { data: orcamento, error: errOrc } = await supabaseClient
    .from('orcamento')
    .insert({
      clienteid:             clienteId,
      dt_orcamento:          dataOrcamentoISO,
      dt_validade_orcamento: dataValidadeISO,
      vl_total_orcamento:    vlTotal
    })
    .select('orcamentoid')
    .single();

  if (errOrc) {
    mensagemOrcamento.textContent = 'Erro ao salvar orçamento: ' + errOrc.message;
    return;
  }

  const itensBanco = itensOrcamento.map(function (item, index) {
    return {
      orcamentoid:     orcamento.orcamentoid,
      orcamentoitemid: index + 1,
      produtoid:       item.produtoid,
      produtodesc:     item.nome,
      qt_produto:      item.quantidade,
      vl_unitario:     item.vl_unitario,
      vl_total:        item.vl_total_item
    };
  });

  const { error: errItens } = await supabaseClient
    .from('orcamento_item')
    .insert(itensBanco);

  if (errItens) {
    mensagemOrcamento.textContent = 'Orçamento salvo, mas erro nos itens: ' + errItens.message;
    return;
  }

  mensagemOrcamento.style.color = '#27ae60';
  mensagemOrcamento.textContent = 'Orçamento #' + orcamento.orcamentoid + ' salvo com sucesso!';
  codigoOrcamentoInput.value    = orcamento.orcamentoid;

  itensOrcamento   = [];
  dataOrcamentoISO = null;
  dataValidadeISO  = null;

  clienteOrcamentoInput.value = '';
  fpDataOrcamento.clear();
  fpDataValidade.clear();
  limparFormItem();
  renderizarTabelaItens();
  recalcularTotalOrcamento();

  if (!blocoListaOrcamentos.classList.contains('elemento-oculto')) {
    carregarListaOrcamentos();
  } else {
    listaCarregada = false;
  }

  setTimeout(function () {
    codigoOrcamentoInput.value    = '';
    mensagemOrcamento.textContent = '';
    mensagemOrcamento.style.color = '';
  }, 4000);
}

/*
  =====================================================
  LISTA DE ORÇAMENTOS CADASTRADOS
  =====================================================
*/

const blocoListaOrcamentos  = document.getElementById('blocoListaOrcamentos');
const corpoListaOrcamentos  = document.getElementById('corpoListaOrcamentos');
let   listaCarregada        = false;

async function toggleListaOrcamentos() {
  const visivel = !blocoListaOrcamentos.classList.contains('elemento-oculto');

  if (visivel) {
    blocoListaOrcamentos.classList.add('elemento-oculto');
    return;
  }

  blocoListaOrcamentos.classList.remove('elemento-oculto');

  if (!listaCarregada) {
    await carregarListaOrcamentos();
  }
}

async function carregarListaOrcamentos() {
  corpoListaOrcamentos.innerHTML =
    '<tr><td colspan="6" class="tabela-vazia">Carregando...</td></tr>';

  const { data, error } = await supabaseClient
    .from('orcamento')
    .select('orcamentoid, dt_orcamento, dt_validade_orcamento, vl_total_orcamento, cliente(nome_cliente)')
    .order('orcamentoid', { ascending: true });

  if (error) {
    corpoListaOrcamentos.innerHTML =
      '<tr><td colspan="6" class="tabela-vazia">Erro ao carregar orçamentos.</td></tr>';
    return;
  }

  listaCarregada = true;
  renderizarListaOrcamentos(data);
}

function renderizarListaOrcamentos(lista) {
  corpoListaOrcamentos.innerHTML = '';

  if (!lista || lista.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" class="tabela-vazia">Nenhum orçamento cadastrado.</td>';
    corpoListaOrcamentos.appendChild(tr);
    return;
  }

  lista.forEach(function (orc) {
    const dtOrc = orc.dt_orcamento
      ? orc.dt_orcamento.substring(0, 10).split('-').reverse().join('/')
      : '—';
    const dtVal = orc.dt_validade_orcamento
      ? orc.dt_validade_orcamento.substring(0, 10).split('-').reverse().join('/')
      : '—';
    const vlTotal = orc.vl_total_orcamento !== null
      ? 'R$ ' + parseFloat(orc.vl_total_orcamento).toFixed(2).replace('.', ',')
      : '—';

    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + orc.orcamentoid + '</td>' +
      '<td>' + (orc.cliente ? orc.cliente.nome_cliente : '—') + '</td>' +
      '<td>' + dtOrc + '</td>' +
      '<td>' + dtVal + '</td>' +
      '<td>' + vlTotal + '</td>' +
      '<td class="acoes-tabela">' +
        '<button class="btn-editar" onclick="visualizarOrcamento(' + orc.orcamentoid + ')">Visualizar</button>' +
      '</td>';
    corpoListaOrcamentos.appendChild(tr);
  });
}

function visualizarOrcamento(id) {
  localStorage.setItem('orcamentoSelecionadoId', id);
  window.location.href = 'orcamento-detalhes.html';
}

/*
  Inicializa os selects e a tabela vazia ao carregar a página.
*/
carregarClientesParaOrcamento();
carregarProdutosParaOrcamento();
renderizarTabelaItens();
