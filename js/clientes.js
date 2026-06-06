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

  data.forEach(function (cliente) {
    const linha = document.createElement('tr');
    linha.innerHTML =
      '<td>' + cliente.clienteid + '</td>' +
      '<td>' + (cliente.tipo_cliente === 'F' ? 'Física' : 'Jurídica') + '</td>' +
      '<td>' + cliente.cpf_cnpj_cliente + '</td>' +
      '<td>' + cliente.nome_cliente + '</td>';
    corpoTabela.appendChild(linha);
  });
}

/*
  =====================================================
  CADASTRO DE CLIENTE
  =====================================================
*/

/*
  Remove o destaque dos campos quando o usuário interagir com eles.
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

  /*
    Validamos o tipo separadamente para destacar o campo
    caso o usuário não tenha feito a seleção.
  */
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

  if (!cpfCnpjCliente || !nomeCliente || !tipoCliente) {
    mensagemCliente.textContent = 'Preencha todos os campos.';
    tipoClienteInput.classList.add('campo-invalido');
    nomeClienteInput.classList.add('campo-invalido');
    cpfCnpjInput.classList.add('campo-invalido');
    tipoClienteInput.focus();
    nomeClienteInput.focus();
    cpfCnpjInput.focus();
    return;
  }

  /*
    Verificamos se o CPF/CNPJ já existe na base de dados
    antes de tentar cadastrar o cliente.
  */
  const { data: clienteExistente } = await supabaseClient
    .from('cliente')
    .select('clienteid')
    .eq('cpf_cnpj_cliente', cpfCnpjCliente)
    .single();

  if (clienteExistente) {
    mensagemCliente.style.color = '';
    mensagemCliente.textContent = 'CPF/CNPJ já cadastrado.';
    cpfCnpjInput.classList.add('campo-invalido');
    cpfCnpjInput.focus();
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
