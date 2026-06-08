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

/*
  =====================================================
  DASHBOARD
  =====================================================
*/

let _mapaCategoriaProduto = {};
let _todosProdutos        = { ativos: [], inativos: [] };

async function carregarDashboard() {
  const hoje = new Date().toISOString().split('T')[0];

  const [
    { count: vigentes,   error: errV },
    { count: expirados,  error: errE },
    { count: clientes,   error: errC },
    { data:  orcTodos,   error: errO },
    { data:  ativos,     error: errA },
    { data:  inativos,   error: errI },
    { data:  categorias }
  ] = await Promise.all([
    supabaseClient.from('orcamento').select('*', { count: 'exact', head: true }).gte('dt_validade_orcamento', hoje),
    supabaseClient.from('orcamento').select('*', { count: 'exact', head: true }).lt('dt_validade_orcamento', hoje),
    supabaseClient.from('cliente').select('*', { count: 'exact', head: true }),
    supabaseClient.from('orcamento').select('vl_total_orcamento'),
    supabaseClient.from('produto').select('produtoid, ds_produto, vl_venda_produto, categoriaprodutoid').eq('status_produto', 'A').order('ds_produto', { ascending: true }),
    supabaseClient.from('produto').select('produtoid, ds_produto, vl_venda_produto, categoriaprodutoid').eq('status_produto', 'I').order('ds_produto', { ascending: true }),
    supabaseClient.from('categoria_produto').select('categoriaprodutoid, ds_categoria_produto')
  ]);

  document.getElementById('cardVigentes').textContent  = errV ? 'Erro' : (vigentes  ?? 0);
  document.getElementById('cardExpirados').textContent = errE ? 'Erro' : (expirados ?? 0);
  document.getElementById('cardClientes').textContent  = errC ? 'Erro' : (clientes  ?? 0);

  if (errO || !orcTodos) {
    document.getElementById('cardTicket').textContent = 'Erro';
  } else if (orcTodos.length === 0) {
    document.getElementById('cardTicket').textContent = 'R$ 0,00';
  } else {
    const soma  = orcTodos.reduce(function (acc, o) { return acc + parseFloat(o.vl_total_orcamento || 0); }, 0);
    const media = soma / orcTodos.length;
    document.getElementById('cardTicket').textContent = 'R$ ' + media.toFixed(2).replace('.', ',');
  }

  _mapaCategoriaProduto = {};
  if (categorias) {
    categorias.forEach(function (cat) {
      _mapaCategoriaProduto[cat.categoriaprodutoid] = cat.ds_categoria_produto;
    });
  }

  renderizarProdutoCard('ativos',   ativos,   errA);
  renderizarProdutoCard('inativos', inativos, errI);

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
    var val = 'R$ ' + parseFloat(p.vl_venda_produto).toFixed(2).replace('.', ',');
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
      ? 'R$ ' + parseFloat(orc.vl_total_orcamento).toFixed(2).replace('.', ',')
      : '—';

    const expirado = orc.dt_validade_orcamento
      ? orc.dt_validade_orcamento.substring(0, 10) < hoje
      : false;

    const tr = document.createElement('tr');
    tr.className = expirado ? 'linha-expirada' : 'linha-vigente';
    tr.innerHTML =
      '<td>' + orc.orcamentoid + '</td>' +
      '<td>' + (orc.cliente ? orc.cliente.nome_cliente : '—') + '</td>' +
      '<td>' + dtOrc + '</td>' +
      '<td>' + dtVal + '</td>' +
      '<td>' + vlTotal + '</td>';
    corpo.appendChild(tr);
  });
}

carregarDashboard();
