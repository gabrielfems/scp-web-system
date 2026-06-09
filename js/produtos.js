/*
  =====================================================
  PEGANDO OS ELEMENTOS DO HTML
  =====================================================
*/

const formProduto             = document.getElementById('formProduto');
const categoriaProdutoInput   = document.getElementById('categoriaProduto');
const statusProdutoInput      = document.getElementById('statusProduto');
const descricaoProdutoInput   = document.getElementById('descricaoProduto');
const valorVendaInput         = document.getElementById('valorVenda');
const observacaoProdutoInput  = document.getElementById('observacaoProduto');
const dataCadastroProdutoInput = document.getElementById('dataCadastroProduto');
const mensagemProduto         = document.getElementById('mensagemProduto');
const corpoTabelaProdutos     = document.getElementById('corpoTabelaProdutos');
const btnCancelarProduto      = document.getElementById('btnCancelarProduto');
const btnSalvarProduto        = document.getElementById('btnSalvarProduto');
const contadorProdutos        = document.getElementById('contadorProdutos');
const filtroProdutoBusca      = document.getElementById('filtroProdutoBusca');

/*
  Controla se estamos editando um produto existente.
  Quando nulo, o formulário faz INSERT; quando preenchido, faz UPDATE.
*/
let produtoEditandoId = null;

/*
  =====================================================
  FILTRO DE BUSCA
  =====================================================
*/

filtroProdutoBusca.addEventListener('input', function () {
  const termo = this.value.toLowerCase();
  const linhas = corpoTabelaProdutos.querySelectorAll('tr');

  linhas.forEach(function (linha) {
    const id         = linha.cells[0] ? linha.cells[0].textContent.toLowerCase() : '';
    const categoria  = linha.cells[1] ? linha.cells[1].textContent.toLowerCase() : '';
    const descricao  = linha.cells[2] ? linha.cells[2].textContent.toLowerCase() : '';
    linha.style.display = (id.includes(termo) || categoria.includes(termo) || descricao.includes(termo)) ? '' : 'none';
  });
});

/*
  Armazena o valor ISO da data selecionada para envio ao banco.
*/
let dataParaSalvar = null;

const fpDataCadastro = flatpickr(dataCadastroProdutoInput, {
  locale:      'pt',
  dateFormat:  'd/m/Y',
  allowInput:  false,
  onChange: function (selectedDates) {
    if (selectedDates.length > 0) {
      dataParaSalvar = selectedDates[0].toISOString();
      dataCadastroProdutoInput.classList.remove('campo-invalido');
      mensagemProduto.textContent = '';
    }
  }
});

/*
  =====================================================
  REMOÇÃO DE DESTAQUE AO INTERAGIR COM OS CAMPOS
  =====================================================
*/

[categoriaProdutoInput, statusProdutoInput].forEach(function (campo) {
  campo.addEventListener('change', function () {
    campo.classList.remove('campo-invalido');
    mensagemProduto.textContent = '';
  });
});

[descricaoProdutoInput, valorVendaInput].forEach(function (campo) {
  campo.addEventListener('input', function () {
    campo.classList.remove('campo-invalido');
    mensagemProduto.textContent = '';
  });
});

/*
  =====================================================
  CARREGA CATEGORIAS NO SELECT
  =====================================================
*/

async function carregarCategoriasParaProduto() {
  const { data } = await supabaseClient
    .from('categoria_produto')
    .select('categoriaprodutoid, ds_categoria_produto')
    .order('ds_categoria_produto', { ascending: true });

  if (!data) return;

  categoriaProdutoInput.innerHTML = '<option value="">Selecione</option>';

  data.forEach(function (cat) {
    const option = document.createElement('option');
    option.value = cat.categoriaprodutoid;
    option.textContent = cat.ds_categoria_produto;
    categoriaProdutoInput.appendChild(option);
  });
}

/*
  =====================================================
  LISTAGEM DE PRODUTOS
  =====================================================
*/

async function carregarProdutos() {
  /*
    Buscamos as categorias para montar um mapa de ID → nome,
    evitando a dependência de FK configurada no Supabase.
  */
  const { data: categorias } = await supabaseClient
    .from('categoria_produto')
    .select('categoriaprodutoid, ds_categoria_produto');

  const mapaCategoria = {};
  if (categorias) {
    categorias.forEach(function (cat) {
      mapaCategoria[cat.categoriaprodutoid] = cat.ds_categoria_produto;
    });
  }

  const { data, error } = await supabaseClient
    .from('produto')
    .select('*')
    .order('produtoid', { ascending: true });

  if (error) {
    mensagemProduto.textContent = 'Erro ao carregar produtos: ' + error.message;
    return;
  }

  corpoTabelaProdutos.innerHTML = '';
  contadorProdutos.textContent = data.length;

  data.forEach(function (produto) {
    const nomeCategoria  = mapaCategoria[produto.categoriaprodutoid] || '-';
    const valorFormatado = 'R$ ' + parseFloat(produto.vl_venda_produto).toFixed(2).replace('.', ',');
    const dataFormatada  = produto.dt_cadastro_produto
      ? produto.dt_cadastro_produto.substring(0, 10).split('-').reverse().join('/')
      : '-';
    const statusTexto    = produto.status_produto.trim() === 'A' ? 'Ativo' : 'Inativo';
    const statusClasse   = produto.status_produto.trim() === 'A' ? 'badge-ativo' : 'badge-inativo';

    const linha = document.createElement('tr');
    linha.innerHTML =
      '<td class="td-codigo">' + produto.produtoid + '</td>' +
      '<td>' + nomeCategoria + '</td>' +
      '<td class="td-nome">' + produto.ds_produto + '</td>' +
      '<td>' + valorFormatado + '</td>' +
      '<td>' + dataFormatada + '</td>' +
      '<td><span class="badge ' + statusClasse + '">' + statusTexto + '</span></td>' +
      '<td class="acoes-tabela">' +
        '<button class="btn-editar" onclick="editarProduto(' + produto.produtoid + ')">Editar</button>' +
        '<button class="btn-excluir" onclick="excluirProduto(' + produto.produtoid + ')">Excluir</button>' +
      '</td>';

    corpoTabelaProdutos.appendChild(linha);
  });
}

/*
  =====================================================
  CADASTRO / ATUALIZAÇÃO DE PRODUTO
  =====================================================
*/

formProduto.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  mensagemProduto.textContent = '';

  const categoriaId  = categoriaProdutoInput.value;
  const status       = statusProdutoInput.value;
  const descricao    = descricaoProdutoInput.value.trim();
  const valorVenda   = valorVendaInput.value;
  const observacao   = observacaoProdutoInput.value.trim();

  if (!categoriaId) {
    categoriaProdutoInput.classList.add('campo-invalido');
    categoriaProdutoInput.focus();
    return;
  }

  if (!descricao) {
    descricaoProdutoInput.classList.add('campo-invalido');
    descricaoProdutoInput.focus();
    return;
  }

  if (!valorVenda || parseFloat(valorVenda) <= 0) {
    valorVendaInput.classList.add('campo-invalido');
    valorVendaInput.focus();
    return;
  }

  if (!status) {
    statusProdutoInput.classList.add('campo-invalido');
    statusProdutoInput.focus();
    return;
  }

  if (!produtoEditandoId && !dataParaSalvar) {
    dataCadastroProdutoInput.classList.add('campo-invalido');
    mensagemProduto.textContent = 'Defina a data de cadastro.';
    return;
  }

  const dados = {
    categoriaprodutoid: parseInt(categoriaId),
    ds_produto:         descricao,
    obs_produto:        observacao || null,
    vl_venda_produto:   parseFloat(valorVenda),
    status_produto:     status
  };

  if (produtoEditandoId) {
    /*
      Modo edição: atualizamos o registro existente (data de cadastro não é alterada).
    */
    const { error } = await supabaseClient
      .from('produto')
      .update(dados)
      .eq('produtoid', produtoEditandoId);

    if (error) {
      mensagemProduto.textContent = 'Erro ao atualizar: ' + error.message;
      return;
    }

    mensagemProduto.style.color = '#27ae60';
    mensagemProduto.textContent = 'Produto atualizado com sucesso!';
    cancelarEdicaoProduto();

  } else {
    /*
      Modo inclusão: inserimos com a data definida pelo usuário.
    */
    dados.dt_cadastro_produto = dataParaSalvar;

    const { error } = await supabaseClient
      .from('produto')
      .insert(dados);

    if (error) {
      mensagemProduto.textContent = 'Erro ao salvar: ' + error.message;
      return;
    }

    mensagemProduto.style.color = '#27ae60';
    mensagemProduto.textContent = 'Produto salvo com sucesso!';
    dataParaSalvar = null;
    formProduto.reset();
    fpDataCadastro.clear();
  }

  await carregarProdutos();
  await carregarProdutosParaOrcamento();

  setTimeout(function () {
    mensagemProduto.textContent = '';
    mensagemProduto.style.color = '';
  }, 3000);
});

/*
  =====================================================
  EDITAR PRODUTO
  =====================================================
*/

async function editarProduto(id) {
  const { data, error } = await supabaseClient
    .from('produto')
    .select('*')
    .eq('produtoid', id)
    .single();

  if (error || !data) return;

  produtoEditandoId = id;

  categoriaProdutoInput.value    = data.categoriaprodutoid;
  descricaoProdutoInput.value    = data.ds_produto;
  observacaoProdutoInput.value   = data.obs_produto || '';
  valorVendaInput.value          = data.vl_venda_produto;
  statusProdutoInput.value       = data.status_produto.trim();

  fpDataCadastro.setDate(
    data.dt_cadastro_produto ? new Date(data.dt_cadastro_produto) : null,
    false
  );

  btnSalvarProduto.textContent = 'Atualizar';
  btnCancelarProduto.classList.remove('elemento-oculto');

  formProduto.scrollIntoView({ behavior: 'smooth' });
}

/*
  =====================================================
  CANCELAR EDIÇÃO
  =====================================================
*/

function cancelarEdicaoProduto() {
  produtoEditandoId = null;
  dataParaSalvar    = null;
  formProduto.reset();
  fpDataCadastro.clear();
  btnSalvarProduto.textContent = 'Salvar';
  btnCancelarProduto.classList.add('elemento-oculto');
}

/*
  =====================================================
  EXCLUIR PRODUTO
  =====================================================
*/

async function excluirProduto(id) {
  if (!confirm('Deseja realmente excluir este produto?')) return;

  const { error } = await supabaseClient
    .from('produto')
    .delete()
    .eq('produtoid', id);

  if (error) {
    mensagemProduto.textContent = 'Erro ao excluir: ' + error.message;
    return;
  }

  await carregarProdutos();
}

/*
  Inicializamos os dados ao carregar a página.
*/
carregarCategoriasParaProduto();
carregarProdutos();
