import {
  onValue,
  push,
  ref,
  remove,
  set,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { database } from "./firebase.js";

// ==========================================
// 1. REGISTRO DO SERVICE WORKER (PWA)
// ==========================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js");
  });
}

const permissaoAdmin = localStorage.getItem("spotifyAdminAllowed");

if (permissaoAdmin !== "true") {
  window.location.replace("./index.html");
} else {
  localStorage.removeItem("spotifyAdminAllowed");
}

const formulario = document.querySelector("#music-form");
const mensagem = document.querySelector("#form-message");
const lista = document.querySelector("#admin-list");
const tituloFormulario = document.querySelector("#titulo-formulario");
const textoCapa = document.querySelector("#texto-capa");

const campoNome = document.querySelector("[name=nome]");
const campoArtista = document.querySelector("[name=artista]");
const campoGenero = document.querySelector("[name=genero]");
const campoArquivo = document.querySelector("[name=arquivo]");
const campoCapa = document.querySelector("[name=capa]");
const campoDuracao = document.querySelector("[name=duracao]");

const botaoSalvar = document.querySelector("#botao-salvar");
const botaoCancelar = document.querySelector("#botao-cancelar");

// Variáveis para guardar estado da edição
let idDaMusicaEditada = null;
let capaDaMusicaEditada = "";

// Função para converter arquivo de imagem selecionado em Texto (Base64)
function transformarImagemEmTexto(arquivoImagem) {
  return new Promise(function (resolve, reject) {
    const leitor = new FileReader();

    leitor.onload = function () {
      resolve(leitor.result);
    };

    leitor.onerror = function () {
      reject(new Error("Não foi possível ler a imagem."));
    };

    leitor.readAsDataURL(arquivoImagem);
  });
}

// Restaura o formulário para o modo de adição
function encerrarEdicao() {
  idDaMusicaEditada = null;
  capaDaMusicaEditada = "";

  campoCapa.required = true;
  tituloFormulario.textContent = "Adicionar música";
  textoCapa.textContent = "Capa do álbum";
  botaoSalvar.textContent = "Salvar música";
  botaoCancelar.hidden = true;

  formulario.reset();
}

// Preenche o formulário com dados da música para edição
function prepararEdicao(musica) {
  idDaMusicaEditada = musica.id;
  capaDaMusicaEditada = musica.capa;

  campoNome.value = musica.nome;
  campoArtista.value = musica.artista;
  campoGenero.value = musica.genero;
  campoArquivo.value = musica.arquivo;
  campoDuracao.value = musica.duracao;

  campoCapa.value = "";
  campoCapa.required = false;

  tituloFormulario.textContent = "Editar música";
  textoCapa.textContent = "Nova capa do álbum (opcional)";
  botaoSalvar.textContent = "Salvar alterações";
  botaoCancelar.hidden = false;

  mensagem.textContent = "Edite os dados e clique em Salvar alterações.";
  mensagem.className = "message";
}

// ==========================================
// 5. ENVIO E SALVAMENTO DE DADOS
// ==========================================
formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const dadosFormulario = new FormData(formulario);
  const imagemSelecionada = dadosFormulario.get("capa");
  const temNovaImagem = imagemSelecionada.size > 0;
  const estaEditando = idDaMusicaEditada !== null;

  botaoSalvar.disabled = true;
  mensagem.className = "message";

  try {
    let imagemEmTexto = capaDaMusicaEditada;

    if (temNovaImagem) {
      mensagem.textContent = "Convertendo imagem…";
      imagemEmTexto = await transformarImagemEmTexto(imagemSelecionada);
    } else {
      mensagem.textContent = "Salvando música…";
    }

    const novaMusica = {
      nome: dadosFormulario.get("nome").trim(),
      artista: dadosFormulario.get("artista").trim(),
      genero: dadosFormulario.get("genero").trim(),
      duracao: dadosFormulario.get("duracao").trim(),
      arquivo: dadosFormulario.get("arquivo").trim(),
      capa: imagemEmTexto,
    };

    if (estaEditando) {
      await set(ref(database, "musicas/" + idDaMusicaEditada), novaMusica);
      mensagem.textContent = "Música editada com sucesso!";
    } else {
      const novaReferencia = push(ref(database, "musicas"));
      await set(novaReferencia, novaMusica);
      mensagem.textContent = "Música adicionada com sucesso!";
    }

    encerrarEdicao();
    mensagem.className = "message success";
  } catch (erro) {
    mensagem.textContent = "Erro ao salvar: " + erro.message;
    mensagem.className = "message error";
  } finally {
    botaoSalvar.disabled = false;
  }
});

botaoCancelar.addEventListener("click", function () {
  encerrarEdicao();
  mensagem.textContent = "Edição cancelada.";
  mensagem.className = "message";
});

// ==========================================
// 6. EXIBIÇÃO DA LISTA DE MÚSICAS NO ADM
// ==========================================
onValue(ref(database, "musicas"), function (resposta) {
  const dadosDoFirebase = resposta.val();
  const musicas = [];

  if (dadosDoFirebase !== null) {
    for (const id in dadosDoFirebase) {
      const musica = dadosDoFirebase[id];
      musica.id = id;
      musicas.push(musica);
    }
  }

  lista.innerHTML = "";

  if (musicas.length === 0) {
    lista.textContent = "Nenhuma música cadastrada.";
    return;
  }

  for (let i = 0; i < musicas.length; i++) {
    const musica = musicas[i];

    const linha = document.createElement("article");
    linha.className = "admin-song";

    const capa = document.createElement("img");
    capa.src = musica.capa || "";
    capa.alt = musica.nome;

    const blocoTexto = document.createElement("div");

    const nome = document.createElement("strong");
    nome.textContent = musica.nome;

    const detalhes = document.createElement("span");
    detalhes.textContent =
      musica.artista + " · " + musica.genero + " · " + musica.duracao;

    blocoTexto.appendChild(nome);
    blocoTexto.appendChild(detalhes);

    const botaoEditar = document.createElement("button");
    botaoEditar.className = "edit-button";
    botaoEditar.type = "button";
    botaoEditar.textContent = "Editar";

    botaoEditar.addEventListener("click", function () {
      prepararEdicao(musica);
    });

    const botaoExcluir = document.createElement("button");
    botaoExcluir.className = "delete-button";
    botaoExcluir.type = "button";
    botaoExcluir.textContent = "Excluir";

    botaoExcluir.addEventListener("click", async function () {
      const desejaExcluir = confirm(
        'Deseja excluir a música "' + musica.nome + '"?'
      );

      if (desejaExcluir) {
        await remove(ref(database, "musicas/" + musica.id));

        if (idDaMusicaEditada === musica.id) {
          encerrarEdicao();
        }
      }
    });

    linha.appendChild(capa);
    linha.appendChild(blocoTexto);
    linha.appendChild(botaoEditar);
    linha.appendChild(botaoExcluir);

    lista.appendChild(linha);
  }
});
