/*
  =====================================================
  NAVEGAÇÃO POR SEÇÕES
  =====================================================

  Ao clicar em um link da sidebar, ocultamos todas as
  seções e exibimos apenas a que foi solicitada.
*/

function mostrarSecao(nome, linkClicado) {
  const secoes = document.querySelectorAll('.secao');
  secoes.forEach(function(secao) {
    secao.classList.add('secao-oculta');
  });

  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(function(link) {
    link.classList.remove('ativo');
  });

  document.getElementById('secao-' + nome).classList.remove('secao-oculta');
  linkClicado.classList.add('ativo');

  if (nome === 'inicio') {
    carregarDashboard();
  }

  fecharSidebar();
}

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

async function carregarDashboard() {
  const hoje = new Date().toISOString().split('T')[0];

  const [
    { count: vigentes,  error: errV },
    { count: expirados, error: errE },
    { count: clientes,  error: errC },
    { data:  orcTodos,  error: errO }
  ] = await Promise.all([
    supabaseClient.from('orcamento').select('*', { count: 'exact', head: true }).gte('dt_validade_orcamento', hoje),
    supabaseClient.from('orcamento').select('*', { count: 'exact', head: true }).lt('dt_validade_orcamento', hoje),
    supabaseClient.from('cliente').select('*', { count: 'exact', head: true }),
    supabaseClient.from('orcamento').select('vl_total_orcamento')
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

  carregarOrcamentosRecentes(hoje);
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
