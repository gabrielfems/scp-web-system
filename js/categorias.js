/*
  =====================================================
  PEGANDO OS ELEMENTOS DO HTML
  =====================================================
*/

const formCategoria              = document.getElementById('formCategoria');
const idCategoriaInput           = document.getElementById('idCategoria');
const descricaoCategoriaInput    = document.getElementById('descricaoCategoria');
const mensagemCategoria          = document.getElementById('mensagemCategoria');
const corpoTabelaCategorias      = document.getElementById('corpoTabelaCategorias');
const btnCancelarCategoriaEdicao = document.getElementById('btnCancelarCategoriaEdicao');
const filtroCategoriaBusca       = document.getElementById('filtroCategoriaBusca');
const contadorCategorias         = document.getElementById('contadorCategorias');

let categoriaEditandoId = null;

/*
  =====================================================
  FILTRO DE BUSCA
  =====================================================
*/

filtroCategoriaBusca.addEventListener('input', function () {
  const termo = this.value.toLowerCase();
  const linhas = corpoTabelaCategorias.querySelectorAll('tr');

  linhas.forEach(function (linha) {
    const codigo    = linha.cells[0] ? linha.cells[0].textContent.toLowerCase() : '';
    const descricao = linha.cells[1] ? linha.cells[1].textContent.toLowerCase() : '';
    linha.style.display = (codigo.includes(termo) || descricao.includes(termo)) ? '' : 'none';
  });
});

/*
  =====================================================
  LIMPEZA DE VALIDAÇÃO AO DIGITAR
  =====================================================
*/

idCategoriaInput.addEventListener('input', function () {
  idCategoriaInput.classList.remove('campo-invalido');
  mensagemCategoria.textContent = '';
});

descricaoCategoriaInput.addEventListener('input', function () {
  descricaoCategoriaInput.classList.remove('campo-invalido');
  mensagemCategoria.textContent = '';
});

/*
  =====================================================
  LISTAGEM DE CATEGORIAS
  =====================================================
*/

async function carregarCategorias() {
  const { data, error } = await supabaseClient
    .from('categoria_produto')
    .select('*')
    .order('categoriaprodutoid', { ascending: true });

  if (error) {
    mensagemCategoria.textContent = 'Erro ao carregar categorias: ' + error.message;
    return;
  }

  corpoTabelaCategorias.innerHTML = '';
  contadorCategorias.textContent = data.length;

  data.forEach(function (categoria) {
    const linha = document.createElement('tr');
    linha.innerHTML =
      '<td class="td-codigo">' + categoria.categoriaprodutoid + '</td>' +
      '<td>' + categoria.ds_categoria_produto + '</td>' +
      '<td class="acoes-tabela">' +
        '<button class="btn-editar" data-id="' + categoria.categoriaprodutoid + '">Editar</button>' +
        '<button class="btn-excluir" data-id="' + categoria.categoriaprodutoid + '">Excluir</button>' +
      '</td>';

    corpoTabelaCategorias.appendChild(linha);

    linha.querySelector('.btn-editar').addEventListener('click', function () {
      categoriaEditandoId         = categoria.categoriaprodutoid;
      idCategoriaInput.value      = categoria.categoriaprodutoid;
      idCategoriaInput.disabled   = true;
      descricaoCategoriaInput.value = categoria.ds_categoria_produto;

      btnCancelarCategoriaEdicao.classList.remove('elemento-oculto');
      formCategoria.scrollIntoView({ behavior: 'smooth' });
    });

    linha.querySelector('.btn-excluir').addEventListener('click', async function () {
      const id = categoria.categoriaprodutoid;
      if (!confirm('Deseja excluir a categoria?')) return;

      const { data: produtosVinculados } = await supabaseClient
        .from('produto')
        .select('produtoid')
        .eq('categoriaprodutoid', id)
        .limit(1);

      if (produtosVinculados && produtosVinculados.length > 0) {
        mensagemCategoria.style.color = '';
        mensagemCategoria.textContent = 'A categoria não pode ser excluída pois está vinculada a produtos.';
        return;
      }

      const { error: erroExclusao } = await supabaseClient
        .from('categoria_produto')
        .delete()
        .eq('categoriaprodutoid', id);

      if (erroExclusao) {
        mensagemCategoria.style.color = '';
        mensagemCategoria.textContent = erroExclusao.code === '23503'
          ? 'A categoria não pode ser excluída pois está vinculada a produtos.'
          : 'Erro ao excluir: ' + erroExclusao.message;
        return;
      }

      await carregarCategorias();
      if (typeof carregarCategoriasParaProduto === 'function') {
        await carregarCategoriasParaProduto();
      }

      mensagemCategoria.style.color = '#27ae60';
      mensagemCategoria.textContent = 'Categoria excluída com sucesso!';
      setTimeout(function () {
        mensagemCategoria.textContent = '';
        mensagemCategoria.style.color = '';
      }, 3000);
    });
  });
}

/*
  =====================================================
  CANCELAR EDIÇÃO
  =====================================================
*/

btnCancelarCategoriaEdicao.addEventListener('click', function () {
  categoriaEditandoId           = null;
  idCategoriaInput.disabled     = false;
  formCategoria.reset();
  mensagemCategoria.textContent = '';
  btnCancelarCategoriaEdicao.classList.add('elemento-oculto');
});

/*
  =====================================================
  CADASTRO / EDIÇÃO DE CATEGORIA
  =====================================================
*/

formCategoria.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  mensagemCategoria.textContent = '';

  const idCategoria        = idCategoriaInput.value.trim();
  const descricaoCategoria = descricaoCategoriaInput.value.trim();

  if (!idCategoria) {
    idCategoriaInput.classList.add('campo-invalido');
    idCategoriaInput.focus();
    return;
  }

  if (!descricaoCategoria) {
    descricaoCategoriaInput.classList.add('campo-invalido');
    descricaoCategoriaInput.focus();
    return;
  }

  /*
    Verificação de código duplicado apenas no cadastro —
    durante edição o código é a própria chave primária e
    o campo fica desabilitado.
  */
  if (categoriaEditandoId === null) {
    const { data: codigoExistente } = await supabaseClient
      .from('categoria_produto')
      .select('categoriaprodutoid')
      .eq('categoriaprodutoid', idCategoria)
      .single();

    if (codigoExistente) {
      mensagemCategoria.textContent = 'Código já cadastrado.';
      idCategoriaInput.classList.add('campo-invalido');
      idCategoriaInput.focus();
      return;
    }
  }

  /*
    Verificação de descrição duplicada em ambos os modos,
    excluindo o próprio registro na edição.
  */
  let queryDescricao = supabaseClient
    .from('categoria_produto')
    .select('categoriaprodutoid')
    .ilike('ds_categoria_produto', descricaoCategoria);

  if (categoriaEditandoId !== null) {
    queryDescricao = queryDescricao.neq('categoriaprodutoid', categoriaEditandoId);
  }

  const { data: descricaoExistente } = await queryDescricao.single();

  if (descricaoExistente) {
    mensagemCategoria.textContent = 'Descrição já cadastrada.';
    descricaoCategoriaInput.classList.add('campo-invalido');
    descricaoCategoriaInput.focus();
    return;
  }

  if (categoriaEditandoId !== null) {
    const { error: erroUpdate } = await supabaseClient
      .from('categoria_produto')
      .update({ ds_categoria_produto: descricaoCategoria })
      .eq('categoriaprodutoid', categoriaEditandoId);

    if (erroUpdate) {
      mensagemCategoria.textContent = 'Erro ao atualizar: ' + erroUpdate.message;
      return;
    }

    categoriaEditandoId           = null;
    idCategoriaInput.disabled     = false;
    btnCancelarCategoriaEdicao.classList.add('elemento-oculto');
    formCategoria.reset();

    await carregarCategorias();
    if (typeof carregarCategoriasParaProduto === 'function') {
      await carregarCategoriasParaProduto();
    }

    mensagemCategoria.style.color = '#27ae60';
    mensagemCategoria.textContent = 'Categoria atualizada com sucesso!';
    setTimeout(function () {
      mensagemCategoria.textContent = '';
      mensagemCategoria.style.color = '';
    }, 3000);

    return;
  }

  const { error } = await supabaseClient
    .from('categoria_produto')
    .insert({
      categoriaprodutoid:   parseInt(idCategoria),
      ds_categoria_produto: descricaoCategoria
    });

  if (error) {
    mensagemCategoria.textContent = 'Erro ao salvar: ' + error.message;
    return;
  }

  mensagemCategoria.style.color = '#27ae60';
  mensagemCategoria.textContent = 'Categoria salva com sucesso!';
  formCategoria.reset();

  await carregarCategorias();
  if (typeof carregarCategoriasParaProduto === 'function') {
    await carregarCategoriasParaProduto();
  }

  setTimeout(function () {
    mensagemCategoria.textContent = '';
    mensagemCategoria.style.color = '';
  }, 3000);
});

/*
  Carregamos a lista de categorias assim que a página abre.
*/
carregarCategorias();
