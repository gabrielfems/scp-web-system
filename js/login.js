/*
  =====================================================
  CONFIGURAÇÃO DO SUPABASE
  =====================================================

  Aqui colocamos os dados do projeto Supabase.

  SUPABASE_URL:
  É a URL do projeto no Supabase.

  SUPABASE_ANON_KEY:
  É a chave pública usada no front-end.

  Importante:
  Nunca use a service_role key no front-end.
*/

const SUPABASE_URL = "https://mhhfkponcogtztgzawny.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E2kd_4MAFBrBHygigBmiQQ_FuEyZ78B";

/*
  Criamos o cliente do Supabase.

  A variável "supabase" existe porque carregamos a biblioteca
  no arquivo index.html com esta linha:

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
*/

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

document.addEventListener('DOMContentLoaded', function () {
  const loginCard = document.querySelector('.login-card');
  const imageCard = document.querySelector('.login-image-card');
  if (loginCard && imageCard) {
    imageCard.style.height = loginCard.offsetHeight + 'px';
  }
});

function toggleSenha() {
  const input = document.getElementById('senha');
  const aberto = document.getElementById('icone-olho-aberto');
  const fechado = document.getElementById('icone-olho-fechado');
  const visivel = input.type === 'password';
  input.type = visivel ? 'text' : 'password';
  aberto.style.display = visivel ? 'none' : '';
  fechado.style.display = visivel ? '' : 'none';
}

/*
  =====================================================
  FUNÇÃO DE LOGIN
  =====================================================

  Pega o e-mail e a senha digitados pelo usuário,
  tenta autenticar no Supabase e redireciona para
  a página inicial em caso de sucesso.
*/

async function fazerLogin() {
  const usuario = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;
  const mensagem = document.getElementById('mensagemLogin');

  mensagem.textContent = '';

  /*
    Verificamos se os campos foram preenchidos
    antes de consultar o banco.
  */
  if (!usuario || !senha) {
    mensagem.textContent = 'Preencha o usuário e a senha.';
    return;
  }

  /*
    Consultamos a tabela USUARIOS no Supabase buscando
    um registro que tenha o usuário e a senha informados.

    .eq() filtra pelo valor exato da coluna.
    .single() retorna um único objeto (ou null se não encontrar).
  */
  const { data, error } = await supabaseClient
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario)
    .eq('senha', senha)
    .single();

  /*
    Se não encontrou nenhum registro, o login está incorreto.
  */
  if (error || !data) {
    mensagem.textContent = 'Usuário ou senha incorretos.';
    return;
  }

  /*
    Login realizado com sucesso: redirecionamos o usuário.
  */
  window.location.href = 'home.html';
}
