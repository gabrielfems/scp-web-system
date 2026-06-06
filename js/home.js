/*
  =====================================================
  NAVEGAÇÃO POR SEÇÕES
  =====================================================

  Ao clicar em um link da sidebar, ocultamos todas as
  seções e exibimos apenas a que foi solicitada.
*/

function mostrarSecao(nome, linkClicado) {
  /*
    Ocultamos todas as seções de conteúdo.
  */
  const secoes = document.querySelectorAll('.secao');
  secoes.forEach(function(secao) {
    secao.classList.add('secao-oculta');
  });

  /*
    Removemos a classe "ativo" de todos os links da sidebar.
  */
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(function(link) {
    link.classList.remove('ativo');
  });

  /*
    Exibimos a seção correspondente ao link clicado
    e marcamos o link como ativo.
  */
  document.getElementById('secao-' + nome).classList.remove('secao-oculta');
  linkClicado.classList.add('ativo');
}
