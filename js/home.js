function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const aberta  = sidebar.classList.toggle('aberta');
  overlay.classList.toggle('visivel', aberta);
}

function fecharSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('aberta');
  overlay.classList.remove('visivel');
}

let _mapaCategoriaProduto = {};
let _todosProdutos        = { ativos: [], inativos: [] };

async function carregarDashboard() {
  const hoje = new Date().toISOString().split('T')[0];
  const d7   = new Date(); d7.setDate(d7.getDate() + 7);
  const hoje7 = d7.toISOString().split('T')[0];

  const [
    { count: vigentes,          error: errV   },
    { count: expirados,         error: errE   },
    { count: clientes,          error: errC   },
    { data:  ativos,            error: errA   },
    { data:  inativos,          error: errI   },
    { data:  categorias                       },
    { data:  orcVigentesValores, error: errVV },
    { data:  todosClientesIds,   error: errTCI},
    { data:  orcClienteIds,      error: errOCI},
    { data:  itensProdutos,      error: errIP },
    { data:  orcVencendo7,       error: errV7 }
  ] = await Promise.all([
    supabaseClient.from('orcamento').select('*', { count: 'exact', head: true }).gte('dt_validade_orcamento', hoje),
    supabaseClient.from('orcamento').select('*', { count: 'exact', head: true }).lt('dt_validade_orcamento', hoje),
    supabaseClient.from('cliente').select('*', { count: 'exact', head: true }),
    supabaseClient.from('produto').select('produtoid, ds_produto, vl_venda_produto, categoriaprodutoid').eq('status_produto', 'A').order('ds_produto', { ascending: true }),
    supabaseClient.from('produto').select('produtoid, ds_produto, vl_venda_produto, categoriaprodutoid').eq('status_produto', 'I').order('ds_produto', { ascending: true }),
    supabaseClient.from('categoria_produto').select('categoriaprodutoid, ds_categoria_produto'),
    supabaseClient.from('orcamento').select('vl_total_orcamento').gte('dt_validade_orcamento', hoje),
    supabaseClient.from('cliente').select('clienteid'),
    supabaseClient.from('orcamento').select('clienteid'),
    supabaseClient.from('orcamento_item').select('produtodesc'),
    supabaseClient.from('orcamento').select('orcamentoid, dt_validade_orcamento, vl_total_orcamento, cliente(nome_cliente)').gte('dt_validade_orcamento', hoje).lte('dt_validade_orcamento', hoje7).order('dt_validade_orcamento', { ascending: true })
  ]);

  document.getElementById('cardVigentes').textContent  = errV ? 'Erro' : (vigentes  ?? 0);
  document.getElementById('cardExpirados').textContent = errE ? 'Erro' : (expirados ?? 0);
  document.getElementById('cardClientes').textContent  = errC ? 'Erro' : (clientes  ?? 0);

  if (errVV || !orcVigentesValores) {
    document.getElementById('cardTicket').textContent = 'Erro';
  } else if (orcVigentesValores.length === 0) {
    document.getElementById('cardTicket').textContent = (0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } else {
    const soma  = orcVigentesValores.reduce(function (acc, o) { return acc + parseFloat(o.vl_total_orcamento || 0); }, 0);
    const media = soma / orcVigentesValores.length;
    document.getElementById('cardTicket').textContent = media.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  _mapaCategoriaProduto = {};
  if (categorias) {
    categorias.forEach(function (cat) {
      _mapaCategoriaProduto[cat.categoriaprodutoid] = cat.ds_categoria_produto;
    });
  }

  renderizarProdutoCard('ativos',   ativos,   errA);
  renderizarProdutoCard('inativos', inativos, errI);

  if (errTCI || errOCI || !todosClientesIds || !orcClienteIds) {
    document.getElementById('cardClientesSemOrcamento').textContent = 'Erro';
  } else {
    const idsComOrc = new Set(orcClienteIds.map(function(o) { return o.clienteid; }));
    document.getElementById('cardClientesSemOrcamento').textContent =
      todosClientesIds.filter(function(c) { return !idsComOrc.has(c.clienteid); }).length;
  }

  renderizarMaisOrcados(itensProdutos, errIP);
  renderizarVencendo7(orcVencendo7, errV7);
  carregarOrcamentosRecentes(hoje);
}

function toggleProdutoCard(tipo) {
  var s     = tipo === 'ativos' ? 'Ativos' : 'Inativos';
  var corpo = document.getElementById('corpo' + s);
  var seta  = document.getElementById('seta' + s);
  corpo.classList.toggle('expandido');
  seta.innerHTML = corpo.classList.contains('expandido') ? '&#9650;' : '&#9660;';
}

function renderizarProdutoCard(tipo, lista, erro) {
  var s      = tipo === 'ativos' ? 'Ativos' : 'Inativos';
  var count  = document.getElementById('count' + s);
  var inner  = document.getElementById('inner' + s);
  var corpo  = document.getElementById('corpo' + s);
  var LIMITE = 10;
  var estaExpandido = corpo.classList.contains('expandido');

  if (erro || !lista) {
    count.textContent = '—';
    inner.innerHTML   = '<p class="produto-card-vazio">Erro ao carregar.</p>';
    return;
  }

  _todosProdutos[tipo] = lista;
  count.textContent    = lista.length;

  if (lista.length === 0) {
    inner.innerHTML = '<p class="produto-card-vazio">Nenhum produto encontrado.</p>';
    return;
  }

  renderizarLinhasProdutos(tipo, lista.slice(0, LIMITE), lista.length > LIMITE);

  if (!estaExpandido) {
    corpo.classList.remove('expandido');
  }
}

function renderizarLinhasProdutos(tipo, visivel, temMais) {
  var s     = tipo === 'ativos' ? 'Ativos' : 'Inativos';
  var inner = document.getElementById('inner' + s);
  var total = _todosProdutos[tipo].length;

  var linhas = visivel.map(function (p) {
    var cat = _mapaCategoriaProduto[p.categoriaprodutoid] || '—';
    var val = parseFloat(p.vl_venda_produto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return '<tr><td>' + p.ds_produto + '</td><td>' + cat + '</td><td>' + val + '</td></tr>';
  }).join('');

  inner.innerHTML =
    '<table class="produto-card-tabela">' +
      '<thead><tr><th>Nome</th><th>Categoria</th><th>Pre&ccedil;o</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody>' +
    '</table>' +
    (temMais
      ? '<button class="btn-ver-todos" type="button" onclick="verTodosProdutos(\'' + tipo + '\')">Ver todos (' + total + ')</button>'
      : '');
}

function verTodosProdutos(tipo) {
  renderizarLinhasProdutos(tipo, _todosProdutos[tipo], false);
}

async function carregarOrcamentosRecentes(hoje) {
  const corpo = document.getElementById('corpoOrcamentosRecentes');

  const { data, error } = await supabaseClient
    .from('orcamento')
    .select('orcamentoid, dt_orcamento, dt_validade_orcamento, vl_total_orcamento, cliente(nome_cliente)')
    .order('orcamentoid', { ascending: false })
    .limit(5);

  if (error) {
    corpo.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Erro ao carregar.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    corpo.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhum orçamento encontrado.</td></tr>';
    return;
  }

  corpo.innerHTML = '';
  data.forEach(function (orc) {
    const dtOrc = orc.dt_orcamento
      ? orc.dt_orcamento.substring(0, 10).split('-').reverse().join('/')
      : '—';
    const dtVal = orc.dt_validade_orcamento
      ? orc.dt_validade_orcamento.substring(0, 10).split('-').reverse().join('/')
      : '—';
    const vlTotal = orc.vl_total_orcamento !== null
      ? parseFloat(orc.vl_total_orcamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';
    const expirado = orc.dt_validade_orcamento
      ? orc.dt_validade_orcamento.substring(0, 10) < hoje
      : false;

    const tr = document.createElement('tr');
    tr.className = expirado ? 'linha-expirada' : 'linha-vigente';
    tr.style.cursor = 'pointer';
    tr.innerHTML =
      '<td>' + orc.orcamentoid + '</td>' +
      '<td>' + (orc.cliente ? orc.cliente.nome_cliente : '—') + '</td>' +
      '<td>' + dtOrc + '</td>' +
      '<td>' + dtVal + '</td>' +
      '<td>' + vlTotal + '</td>';
    tr.addEventListener('click', function () { abrirModalDetalheOrcamento(orc.orcamentoid); });
    corpo.appendChild(tr);
  });
}

async function abrirModalDetalheOrcamento(id) {
  abrirModal('Orçamento #' + id, _modalCarregando());

  const [{ data: orc, error: errOrc }, { data: itens, error: errItens }] = await Promise.all([
    supabaseClient
      .from('orcamento')
      .select('orcamentoid, dt_orcamento, dt_validade_orcamento, vl_total_orcamento, cliente(nome_cliente)')
      .eq('orcamentoid', id)
      .single(),
    supabaseClient
      .from('orcamento_item')
      .select('produtodesc, qt_produto, vl_unitario, vl_total')
      .eq('orcamentoid', id)
      .order('orcamentoitemid', { ascending: true })
  ]);

  if (errOrc || !orc) { _modalErro(); return; }

  const hoje  = new Date().toISOString().split('T')[0];
  const dtOrc = orc.dt_orcamento
    ? orc.dt_orcamento.substring(0, 10).split('-').reverse().join('/')
    : '—';
  const dtVal = orc.dt_validade_orcamento
    ? orc.dt_validade_orcamento.substring(0, 10).split('-').reverse().join('/')
    : '—';
  const expirado = orc.dt_validade_orcamento && orc.dt_validade_orcamento.substring(0, 10) < hoje;
  const statusBadge = expirado
    ? '<span style="background:#fdecea;color:#c0392b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">Expirado</span>'
    : '<span style="background:#eafaf1;color:#27ae60;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">Vigente</span>';

  const vlTotal = orc.vl_total_orcamento !== null
    ? parseFloat(orc.vl_total_orcamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

  var linhasItens = '';
  if (errItens || !itens || itens.length === 0) {
    linhasItens = '<tr><td colspan="4" class="tabela-vazia">Nenhum item encontrado.</td></tr>';
  } else {
    linhasItens = itens.map(function (it) {
      var vlUnit = parseFloat(it.vl_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      var vlTot  = parseFloat(it.vl_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return '<tr><td>' + (it.produtodesc || '—') + '</td><td style="text-align:center">' + it.qt_produto + '</td><td style="text-align:right">' + vlUnit + '</td><td style="text-align:right">' + vlTot + '</td></tr>';
    }).join('');
  }

  document.getElementById('modalCorpo').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;font-size:13px;">' +
      '<div><span style="color:#888">Cliente</span><br><strong>' + (orc.cliente ? orc.cliente.nome_cliente : '—') + '</strong></div>' +
      '<div><span style="color:#888">Status</span><br>' + statusBadge + '</div>' +
      '<div><span style="color:#888">Data do Orçamento</span><br><strong>' + dtOrc + '</strong></div>' +
      '<div><span style="color:#888">Validade</span><br><strong>' + dtVal + '</strong></div>' +
      '<div><span style="color:#888">Valor Total</span><br><strong>' + vlTotal + '</strong></div>' +
    '</div>' +
    '<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin:0 0 8px">Itens</p>' +
    '<table class="tabela-dados">' +
      '<thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>' +
      '<tbody>' + linhasItens + '</tbody>' +
    '</table>';
}

function renderizarMaisOrcados(itens, erro) {
  const corpo = document.getElementById('corpoMaisOrcados');
  if (erro || !itens) {
    corpo.innerHTML = '<tr><td colspan="2" class="tabela-vazia">Erro ao carregar.</td></tr>';
    return;
  }
  if (itens.length === 0) {
    corpo.innerHTML = '<tr><td colspan="2" class="tabela-vazia">Nenhum item encontrado.</td></tr>';
    return;
  }
  var contagem = {};
  itens.forEach(function(item) {
    var nome = item.produtodesc || '—';
    contagem[nome] = (contagem[nome] || 0) + 1;
  });
  var ordenados = Object.keys(contagem)
    .map(function(k) { return { nome: k, count: contagem[k] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 5);
  corpo.innerHTML = ordenados.map(function(p) {
    return '<tr><td>' + p.nome + '</td><td>' + p.count + '</td></tr>';
  }).join('');
}

function renderizarVencendo7(lista, erro) {
  var secao  = document.getElementById('secaoVencendo7');
  var listEl = document.getElementById('listaVencendo7');
  if (erro || !lista || lista.length === 0) {
    secao.style.display = 'none';
    return;
  }
  secao.style.display = '';
  listEl.innerHTML = lista.map(function(orc) {
    var dtVal = orc.dt_validade_orcamento
      ? orc.dt_validade_orcamento.substring(0, 10).split('-').reverse().join('/')
      : '—';
    var vlTotal = orc.vl_total_orcamento !== null && orc.vl_total_orcamento !== undefined
      ? parseFloat(orc.vl_total_orcamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';
    var nomeCliente = orc.cliente ? orc.cliente.nome_cliente : '—';
    return '<li>' + nomeCliente + ' &nbsp;&middot;&nbsp; Validade: ' + dtVal + ' &nbsp;&middot;&nbsp; ' + vlTotal + '</li>';
  }).join('');
}

// ===== MODAL =====

function abrirModal(titulo, htmlConteudo) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalCorpo').innerHTML = htmlConteudo;
  document.getElementById('modalOverlay').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('modalCorpo').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
  });
});

function _modalCarregando() {
  return '<p style="text-align:center;color:#888;padding:24px">Carregando...</p>';
}

function _modalErro() {
  document.getElementById('modalCorpo').innerHTML =
    '<p style="text-align:center;color:#c0392b;padding:24px">Erro ao carregar dados.</p>';
}

function _tabelaOrcamentos(data) {
  if (!data || data.length === 0) {
    return '<p style="text-align:center;color:#888;padding:24px">Nenhum orçamento encontrado.</p>';
  }
  var linhas = data.map(function(orc) {
    var dtVal = orc.dt_validade_orcamento
      ? orc.dt_validade_orcamento.substring(0, 10).split('-').reverse().join('/')
      : '—';
    var vlTotal = orc.vl_total_orcamento !== null && orc.vl_total_orcamento !== undefined
      ? parseFloat(orc.vl_total_orcamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';
    return '<tr><td>' + (orc.cliente ? orc.cliente.nome_cliente : '—') + '</td><td>' + dtVal + '</td><td>' + vlTotal + '</td></tr>';
  }).join('');
  return '<table class="tabela-dados"><thead><tr><th>Cliente</th><th>Validade</th><th>Valor Total</th></tr></thead><tbody>' + linhas + '</tbody></table>';
}

async function abrirModalVigentes() {
  abrirModal('Orçamentos Vigentes', _modalCarregando());
  var hoje = new Date().toISOString().split('T')[0];
  var { data, error } = await supabaseClient
    .from('orcamento')
    .select('dt_validade_orcamento, vl_total_orcamento, cliente(nome_cliente)')
    .gte('dt_validade_orcamento', hoje)
    .order('dt_validade_orcamento', { ascending: true });
  if (error || !data) { _modalErro(); return; }
  document.getElementById('modalCorpo').innerHTML = _tabelaOrcamentos(data);
}

async function abrirModalExpirados() {
  abrirModal('Orçamentos Expirados', _modalCarregando());
  var hoje = new Date().toISOString().split('T')[0];
  var { data, error } = await supabaseClient
    .from('orcamento')
    .select('dt_validade_orcamento, vl_total_orcamento, cliente(nome_cliente)')
    .lt('dt_validade_orcamento', hoje)
    .order('dt_validade_orcamento', { ascending: false });
  if (error || !data) { _modalErro(); return; }
  document.getElementById('modalCorpo').innerHTML = _tabelaOrcamentos(data);
}

async function abrirModalClientes() {
  abrirModal('Clientes Cadastrados', _modalCarregando());
  var { data, error } = await supabaseClient
    .from('cliente')
    .select('clienteid, nome_cliente, tipo_cliente, cpf_cnpj_cliente')
    .order('nome_cliente', { ascending: true });
  if (error || !data) { _modalErro(); return; }
  if (data.length === 0) {
    document.getElementById('modalCorpo').innerHTML =
      '<p style="text-align:center;color:#888;padding:24px">Nenhum cliente cadastrado.</p>';
    return;
  }
  var linhas = data.map(function(c) {
    var tipo = c.tipo_cliente === 'F' ? 'Pessoa F&iacute;sica' : c.tipo_cliente === 'J' ? 'Pessoa Jur&iacute;dica' : '—';
    return '<tr><td>' + c.clienteid + '</td><td>' + tipo + '</td><td>' + (c.cpf_cnpj_cliente || '—') + '</td><td>' + (c.nome_cliente || '—') + '</td></tr>';
  }).join('');
  document.getElementById('modalCorpo').innerHTML =
    '<table class="tabela-dados"><thead><tr><th>C&oacute;digo</th><th>Tipo</th><th>CPF/CNPJ</th><th>Nome</th></tr></thead><tbody>' + linhas + '</tbody></table>';
}

async function abrirModalSemOrcamento() {
  abrirModal('Clientes sem Orçamento', _modalCarregando());
  var [{ data: todosClientes, error: errTC }, { data: orcIds, error: errOI }] = await Promise.all([
    supabaseClient.from('cliente').select('clienteid, nome_cliente, tipo_cliente').order('nome_cliente', { ascending: true }),
    supabaseClient.from('orcamento').select('clienteid')
  ]);
  if (errTC || errOI || !todosClientes || !orcIds) { _modalErro(); return; }
  var idsComOrc = new Set(orcIds.map(function(o) { return o.clienteid; }));
  var semOrc = todosClientes.filter(function(c) { return !idsComOrc.has(c.clienteid); });
  if (semOrc.length === 0) {
    document.getElementById('modalCorpo').innerHTML =
      '<p style="text-align:center;color:#888;padding:24px">Todos os clientes possuem or&ccedil;amento.</p>';
    return;
  }
  var linhas = semOrc.map(function(c) {
    var tipo = c.tipo_cliente === 'F' ? 'Pessoa F&iacute;sica' : c.tipo_cliente === 'J' ? 'Pessoa Jur&iacute;dica' : '—';
    return '<tr><td>' + c.clienteid + '</td><td>' + (c.nome_cliente || '—') + '</td><td>' + tipo + '</td></tr>';
  }).join('');
  document.getElementById('modalCorpo').innerHTML =
    '<table class="tabela-dados"><thead><tr><th>C&oacute;digo</th><th>Nome</th><th>Tipo</th></tr></thead><tbody>' + linhas + '</tbody></table>';
}

carregarDashboard();