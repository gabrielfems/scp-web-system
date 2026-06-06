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
const idCategoriaExcluirInput    = document.getElementById('idCategoriaExcluir');
const mensagemExclusaoCategoria  = document.getElementById('mensagemExclusaoCategoria');

/*
  Remove o destaque dos campos quando o usuário interagir com eles.
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

  data.forEach(function (categoria) {
    const linha = document.createElement('tr');
    linha.innerHTML =
      '<td>' + categoria.categoriaprodutoid + '</td>' +
      '<td>' + categoria.ds_categoria_produto + '</td>';
    corpoTabelaCategorias.appendChild(linha);
  });
}

/*
  =====================================================
  CADASTRO DE CATEGORIA
  =====================================================
*/

formCategoria.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  mensagemCategoria.textContent = '';

  const idCategoria    = idCategoriaInput.value.trim();
  const descricaoCategoria = descricaoCategoriaInput.value.trim();

  /*
    Validamos os campos obrigatórios.
  */
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
    Verificamos se o código já está cadastrado no banco.
  */
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

  /*
    Verificamos se a descrição já está cadastrada no banco.
  */
  const { data: descricaoExistente } = await supabaseClient
    .from('categoria_produto')
    .select('categoriaprodutoid')
    .ilike('ds_categoria_produto', descricaoCategoria)
    .single();

  if (descricaoExistente) {
    mensagemCategoria.textContent = 'Descrição já cadastrada.';
    descricaoCategoriaInput.classList.add('campo-invalido');
    descricaoCategoriaInput.focus();
    return;
  }

  const { error } = await supabaseClient
    .from('categoria_produto')
    .insert({
      categoriaprodutoid:  parseInt(idCategoria),
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
  await carregarCategoriasParaProduto();

  setTimeout(function () {
    mensagemCategoria.textContent = '';
    mensagemCategoria.style.color = '';
  }, 3000);
});

/*
  =====================================================
  EXCLUSÃO DE CATEGORIA
  =====================================================
*/

idCategoriaExcluirInput.addEventListener('input', function () {
  idCategoriaExcluirInput.classList.remove('campo-invalido');
  mensagemExclusaoCategoria.textContent = '';
  mensagemExclusaoCategoria.style.color = '';
});

async function excluirCategoria() {
  mensagemExclusaoCategoria.textContent = '';
  mensagemExclusaoCategoria.style.color = '';

  const id = parseInt(idCategoriaExcluirInput.value);

  if (!id || id <= 0) {
    mensagemExclusaoCategoria.textContent = 'Informe um ID válido para exclusão.';
    idCategoriaExcluirInput.classList.add('campo-invalido');
    idCategoriaExcluirInput.focus();
    return;
  }

  if (!confirm('Tem certeza que deseja excluir a categoria de ID ' + id + '? Essa ação não pode ser desfeita.')) {
    return;
  }

  const { data: categoriaExistente } = await supabaseClient
    .from('categoria_produto')
    .select('categoriaprodutoid')
    .eq('categoriaprodutoid', id)
    .single();

  if (!categoriaExistente) {
    mensagemExclusaoCategoria.textContent = 'Nenhuma categoria com o ID ' + id + ' foi encontrada.';
    return;
  }

  const { data: produtosVinculados } = await supabaseClient
    .from('produto')
    .select('produtoid')
    .eq('categoriaprodutoid', id)
    .limit(1);

  if (produtosVinculados && produtosVinculados.length > 0) {
    mensagemExclusaoCategoria.textContent = 'A categoria não pode ser excluída pois está vinculada a um ou mais produtos.';
    return;
  }

  const { error } = await supabaseClient
    .from('categoria_produto')
    .delete()
    .eq('categoriaprodutoid', id);

  if (error) {
    if (error.code === '23503') {
      mensagemExclusaoCategoria.textContent = 'A categoria não pode ser excluída pois está vinculada a um ou mais produtos.';
    } else {
      mensagemExclusaoCategoria.textContent = 'Erro ao excluir: ' + error.message;
    }
    return;
  }

  mensagemExclusaoCategoria.style.color = '#27ae60';
  mensagemExclusaoCategoria.textContent = 'Categoria ' + id + ' excluída com sucesso!';
  idCategoriaExcluirInput.value = '';
  idCategoriaExcluirInput.classList.remove('campo-invalido');

  await carregarCategorias();
  await carregarCategoriasParaProduto();

  setTimeout(function () {
    mensagemExclusaoCategoria.textContent = '';
    mensagemExclusaoCategoria.style.color = '';
  }, 3000);
}

/*
  Carregamos a lista de categorias assim que a página abre.
*/
carregarCategorias();
