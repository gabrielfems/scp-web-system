/*
  =====================================================
  PEGANDO OS ELEMENTOS DO HTML
  =====================================================
*/

const formCliente        = document.getElementById('formCliente');
const tipoClienteInput   = document.getElementById('tipoCliente');
const cpfCnpjInput       = document.getElementById('cpfCnpjCliente');
const nomeClienteInput   = document.getElementById('nomeCliente');
const mensagemCliente    = document.getElementById('mensagemCliente');
const corpoTabela        = document.getElementById('corpoTabelaClientes');
const btnCancelarEdicao  = document.getElementById('btnCancelarEdicao');
const filtroBusca        = document.getElementById('filtroBusca');
const contadorClientes   = document.getElementById('contadorClientes');

let clienteEditandoId = null;

/*
  =====================================================
  FILTRO DE BUSCA
  =====================================================
*/

filtroBusca.addEventListener('input', function () {
  const termo = this.value.toLowerCase();
  const linhas = corpoTabela.querySelectorAll('tr');

  linhas.forEach(function (linha) {
    const nome    = linha.cells[3] ? linha.cells[3].textContent.toLowerCase() : '';
    const cpfCnpj = linha.cells[2] ? linha.cells[2].textContent.toLowerCase() : '';
    linha.style.display = (nome.includes(termo) || cpfCnpj.includes(termo)) ? '' : 'none';
  });
});

/*
  =====================================================
  MÁSCARA DE CPF / CNPJ
  =====================================================

  Quando o tipo muda, limpamos o campo e ajustamos
  o placeholder. A formatação é aplicada conforme
  o usuário digita.
*/

tipoClienteInput.addEventListener('change', function () {
  cpfCnpjInput.value = '';

  if (this.value === 'F') {
    cpfCnpjInput.placeholder = '000.000.000-00';
    cpfCnpjInput.maxLength = 14;
  } else if (this.value === 'J') {
    cpfCnpjInput.placeholder = '00.000.000/0000-00';
    cpfCnpjInput.maxLength = 18;
  } else {
    cpfCnpjInput.placeholder = 'Selecione o tipo de cliente';
    cpfCnpjInput.maxLength = 18;
  }
});

cpfCnpjInput.addEventListener('input', function () {
  const tipo = tipoClienteInput.value;
  let valor = this.value.replace(/\D/g, '');

  if (tipo === 'F') {
    valor = valor.slice(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else if (tipo === 'J') {
    valor = valor.slice(0, 14);
    valor = valor.replace(/(\d{2})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1/$2');
    valor = valor.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  this.value = valor;
});

/*
  =====================================================
  LISTAGEM DE CLIENTES
  =====================================================
*/

async function carregarClientes() {
  const { data, error } = await supabaseClient
    .from('cliente')
    .select('*')
    .order('clienteid', { ascending: true });

  if (error) {
    mensagemCliente.textContent = 'Erro ao carregar clientes: ' + error.message;
    return;
  }

  corpoTabela.innerHTML = '';
  contadorClientes.textContent = data.length;

  data.forEach(function (cliente) {
    const tipoBadge = cliente.tipo_cliente === 'F'
      ? '<span class="badge badge-f">Física</span>'
      : '<span class="badge badge-j">Jurídica</span>';

    const linha = document.createElement('tr');
    linha.innerHTML =
      '<td class="td-codigo">' + cliente.clienteid + '</td>' +
      '<td>' + tipoBadge + '</td>' +
      '<td>' + cliente.cpf_cnpj_cliente + '</td>' +
      '<td class="td-nome">' + cliente.nome_cliente + '</td>' +
      '<td class="acoes-tabela">' +
        '<button class="btn-editar" data-id="' + cliente.clienteid + '">Editar</button>' +
        '<button class="btn-excluir" data-id="' + cliente.clienteid + '">Excluir</button>' +
      '</td>';

    corpoTabela.appendChild(linha);

    linha.querySelector('.btn-editar').addEventListener('click', function () {
      const id = parseInt(this.dataset.id);
      clienteEditandoId = id;

      tipoClienteInput.value    = cliente.tipo_cliente;
      tipoClienteInput.dispatchEvent(new Event('change'));
      cpfCnpjInput.value        = cliente.cpf_cnpj_cliente;
      nomeClienteInput.value    = cliente.nome_cliente;

      btnCancelarEdicao.classList.remove('elemento-oculto');
      formCliente.scrollIntoView({ behavior: 'smooth' });
    });

    linha.querySelector('.btn-excluir').addEventListener('click', async function () {
      const id = parseInt(this.dataset.id);
      if (!confirm('Deseja excluir o cliente?')) return;

      const { error: erroExclusao } = await supabaseClient
        .from('cliente')
        .delete()
        .eq('clienteid', id);

      if (erroExclusao) {
        mensagemCliente.style.color = '';
        mensagemCliente.textContent = 'Erro ao excluir: ' + erroExclusao.message;
        return;
      }

      await carregarClientes();

      mensagemCliente.style.color = '#27ae60';
      mensagemCliente.textContent = 'Cliente excluído com sucesso!';
      setTimeout(function () {
        mensagemCliente.textContent = '';
        mensagemCliente.style.color = '';
      }, 3000);
    });
  });
}

/*
  =====================================================
  CANCELAR EDIÇÃO
  =====================================================
*/

btnCancelarEdicao.addEventListener('click', function () {
  clienteEditandoId = null;
  formCliente.reset();
  mensagemCliente.textContent = '';
  btnCancelarEdicao.classList.add('elemento-oculto');
});

/*
  =====================================================
  CADASTRO / EDIÇÃO DE CLIENTE
  =====================================================
*/

tipoClienteInput.addEventListener('change', function () {
  tipoClienteInput.classList.remove('campo-invalido');
});

cpfCnpjInput.addEventListener('input', function () {
  cpfCnpjInput.classList.remove('campo-invalido');
});

nomeClienteInput.addEventListener('input', function () {
  nomeClienteInput.classList.remove('campo-invalido');
});

formCliente.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  mensagemCliente.textContent = '';

  const tipoCliente    = tipoClienteInput.value.trim();
  const cpfCnpjCliente = cpfCnpjInput.value.trim();
  const nomeCliente    = nomeClienteInput.value.trim();

  if (!tipoCliente) {
    tipoClienteInput.classList.add('campo-invalido');
    tipoClienteInput.focus();
    return;
  }

  if (!nomeCliente) {
    nomeClienteInput.classList.add('campo-invalido');
    nomeClienteInput.focus();
    return;
  }

  if (!cpfCnpjCliente) {
    cpfCnpjInput.classList.add('campo-invalido');
    cpfCnpjInput.focus();
    return;
  }

  /*
    Verificamos duplicidade de CPF/CNPJ, excluindo o próprio
    registro quando estamos em modo de edição.
  */
  let queryDuplicado = supabaseClient
    .from('cliente')
    .select('clienteid')
    .eq('cpf_cnpj_cliente', cpfCnpjCliente);

  if (clienteEditandoId !== null) {
    queryDuplicado = queryDuplicado.neq('clienteid', clienteEditandoId);
  }

  const { data: clienteExistente } = await queryDuplicado.single();

  if (clienteExistente) {
    mensagemCliente.style.color = '';
    mensagemCliente.textContent = 'CPF/CNPJ já cadastrado.';
    cpfCnpjInput.classList.add('campo-invalido');
    cpfCnpjInput.focus();
    return;
  }

  if (clienteEditandoId !== null) {
    const { error: erroUpdate } = await supabaseClient
      .from('cliente')
      .update({
        tipo_cliente:     tipoCliente,
        cpf_cnpj_cliente: cpfCnpjCliente,
        nome_cliente:     nomeCliente
      })
      .eq('clienteid', clienteEditandoId);

    if (erroUpdate) {
      mensagemCliente.textContent = 'Erro ao atualizar: ' + erroUpdate.message;
      return;
    }

    clienteEditandoId = null;
    btnCancelarEdicao.classList.add('elemento-oculto');
    formCliente.reset();
    await carregarClientes();

    mensagemCliente.style.color = '#27ae60';
    mensagemCliente.textContent = 'Cliente atualizado com sucesso!';
    setTimeout(function () {
      mensagemCliente.textContent = '';
      mensagemCliente.style.color = '';
    }, 3000);

    return;
  }

  const { error } = await supabaseClient
    .from('cliente')
    .insert({
      tipo_cliente:     tipoCliente,
      cpf_cnpj_cliente: cpfCnpjCliente,
      nome_cliente:     nomeCliente
    });

  if (error) {
    mensagemCliente.textContent = 'Erro ao salvar: ' + error.message;
    return;
  }

  mensagemCliente.style.color = '#27ae60';
  mensagemCliente.textContent = 'Cliente salvo com sucesso!';
  formCliente.reset();

  await carregarClientes();

  setTimeout(function () {
    mensagemCliente.textContent = '';
    mensagemCliente.style.color = '';
  }, 3000);
});

/*
  Carregamos a lista de clientes assim que a página abre.
*/
carregarClientes();
