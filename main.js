import {
  onValue,
  ref,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { database } from "./firebase.js";

// ==========================================
// 1. REGISTRO DO SERVICE WORKER (PWA)
// ==========================================
// Verifica se o navegador suporta Service Worker para o PWA funcionar
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js");
  });
}

const listaMusicas = document.querySelector("#music-grid");
const campoBusca = document.querySelector("#pesquisa");
const filtroGenero = document.querySelector("#filtro-genero");
const botaoInicio = document.querySelector("#btn-inicio");
const totalMusicas = document.querySelector("#song-count");
const audioPlayer = document.querySelector("#audio");
const botaoPlay = document.querySelector("#play-toggle");
const capaAtual = document.querySelector("#now-cover");
const nomeAtual = document.querySelector("#now-title");
const artistaAtual = document.querySelector("#now-artist");
const tempoAtual = document.querySelector("#current-time");
const tempoTotal = document.querySelector("#duration");
const barraProgresso = document.querySelector("#seek");
const barraVolume = document.querySelector("#volume");
const listaFila = document.querySelector("#lista-fila");

let musicas = [];
let filaDeReproducao = [];
let filaDeMusicas = [];
let musicaAtual = null;
let tempoDeEspera;

// Converte segundos em formato de tempo "0:00"
function formatarTempo(segundos) {
  if (!segundos || isNaN(segundos)) {
    return "0:00";
  }

  const minutos = Math.floor(segundos / 60);
  let segundosRestantes = Math.floor(segundos % 60);

  if (segundosRestantes < 10) {
    segundosRestantes = "0" + segundosRestantes;
  }

  return minutos + ":" + segundosRestantes;
}

// Atualiza a lista da Fila na barra lateral
function atualizarFilaUI() {
  listaFila.innerHTML = "";

  if (filaDeReproducao.length === 0) {
    const textoVazio = document.createElement("span");
    textoVazio.className = "empty-queue";
    textoVazio.textContent = "A fila está vazia";
    listaFila.appendChild(textoVazio);
    return;
  }

  for (let i = 0; i < filaDeReproducao.length; i++) {
    const musica = filaDeReproducao[i];

    const item = document.createElement("div");
    item.className = "fila-item";

    const imagem = document.createElement("img");
    imagem.src = musica.capa || "";
    imagem.alt = "";

    const blocoTexto = document.createElement("div");

    const titulo = document.createElement("strong");
    titulo.textContent = musica.nome;

    const artista = document.createElement("span");
    artista.textContent = musica.artista;

    blocoTexto.appendChild(titulo);
    blocoTexto.appendChild(artista);

    // Botão de remover da fila
    const botaoRemover = document.createElement("button");
    botaoRemover.className = "remove-from-queue";
    botaoRemover.type = "button";
    botaoRemover.textContent = "✕";
    botaoRemover.title = "Remover da fila";

    botaoRemover.addEventListener("click", function (evento) {
      evento.stopPropagation();
      // Remove o item do array na posição 'i'
      filaDeReproducao.splice(i, 1);
      atualizarFilaUI();
    });

    item.appendChild(imagem);
    item.appendChild(blocoTexto);
    item.appendChild(botaoRemover);

    listaFila.appendChild(item);
  }
}

// Preenche as opções do select de gêneros sem repetir nomes
function popularFiltroGeneros() {
  filtroGenero.innerHTML = '<option value="">Todos os gêneros</option>';

  const generosEncontrados = [];

  for (let i = 0; i < musicas.length; i++) {
    const genero = musicas[i].genero;
    // Se o gênero existe e ainda não foi adicionado ao array
    if (genero && generosEncontrados.includes(genero) === false) {
      generosEncontrados.push(genero);
    }
  }

  // Adiciona cada gênero como uma opção no <select>
  for (let i = 0; i < generosEncontrados.length; i++) {
    const opcao = document.createElement("option");
    opcao.value = generosEncontrados[i];
    opcao.textContent = generosEncontrados[i];
    filtroGenero.appendChild(opcao);
  }
}

// Monta o cartão visual de cada música na biblioteca
function criarCardDaMusica(musica, listaContexto) {
  const card = document.createElement("article");
  card.className = "track-card";

  const areaCapa = document.createElement("div");
  areaCapa.className = "cover-wrap";

  const imagemCapa = document.createElement("img");
  imagemCapa.className = "cover";
  imagemCapa.src = musica.capa || "";
  imagemCapa.alt = "Capa da música " + musica.nome;

  if (!musica.capa) {
    imagemCapa.hidden = true;
  }

  const botaoTocar = document.createElement("button");
  botaoTocar.className = "card-play";
  botaoTocar.type = "button";
  botaoTocar.textContent = "▶";

  botaoTocar.addEventListener("click", function () {
    tocarMusica(musica, listaContexto);
  });

  areaCapa.appendChild(imagemCapa);
  areaCapa.appendChild(botaoTocar);

  const info = document.createElement("div");
  info.className = "track-info";

  const titulo = document.createElement("h3");
  titulo.textContent = musica.nome || "Sem título";

  const artista = document.createElement("p");
  artista.textContent = musica.artista || "Artista desconhecido";

  const detalhes = document.createElement("div");
  detalhes.className = "track-meta";

  const textoMeta = document.createElement("span");
  textoMeta.textContent =
    (musica.genero || "") + " · " + (musica.duracao || "");

  const botaoFila = document.createElement("button");
  botaoFila.className = "add-to-queue";
  botaoFila.type = "button";
  botaoFila.textContent = "+ Fila";

  botaoFila.addEventListener("click", function (evento) {
    evento.stopPropagation();
    filaDeReproducao.push(musica);
    atualizarFilaUI();
  });

  detalhes.appendChild(textoMeta);
  detalhes.appendChild(botaoFila);

  info.appendChild(titulo);
  info.appendChild(artista);
  info.appendChild(detalhes);

  card.appendChild(areaCapa);
  card.appendChild(info);

  return card;
}

// Filtra e desenha as músicas na tela de acordo com a busca e o gênero
function mostrarMusicas() {
  const textoBuscado = campoBusca.value.toLowerCase().trim();
  const generoSelecionado = filtroGenero.value;

  const musicasFiltradas = [];

  // Percorre as músicas e verifica quais correspondem aos filtros
  for (let i = 0; i < musicas.length; i++) {
    const musica = musicas[i];
    const nomeEArtista = (musica.nome + " " + musica.artista).toLowerCase();

    const combinaComTexto = nomeEArtista.includes(textoBuscado);
    const combinaComGenero =
      generoSelecionado === "" || musica.genero === generoSelecionado;

    if (combinaComTexto && combinaComGenero) {
      musicasFiltradas.push(musica);
    }
  }

  totalMusicas.textContent = musicasFiltradas.length + " faixas";
  listaMusicas.innerHTML = "";

  if (musicasFiltradas.length === 0) {
    const mensagem = document.createElement("p");
    mensagem.className = "empty-state";

    if (musicas.length === 0) {
      mensagem.textContent = "Ainda não há músicas. Adicione pelo Espaço ADM.";
    } else {
      mensagem.textContent = "Nenhuma música encontrada. Tente outra busca.";
    }

    listaMusicas.appendChild(mensagem);
    return;
  }

  // Desenha os cartões na tela
  for (let i = 0; i < musicasFiltradas.length; i++) {
    const card = criarCardDaMusica(musicasFiltradas[i], musicasFiltradas);
    listaMusicas.appendChild(card);
  }
}

// Toca uma música específica no player
function tocarMusica(musica, listaContexto) {
  if (listaContexto && listaContexto.length > 0) {
    filaDeMusicas = listaContexto;
  } else if (filaDeMusicas.length === 0) {
    filaDeMusicas = musicas;
  }

  musicaAtual = musica;

  audioPlayer.src = musica.arquivo;
  audioPlayer.play().catch(function (erro) {
    console.error("Erro ao tocar áudio:", erro);
  });

  nomeAtual.textContent = musica.nome;
  artistaAtual.textContent = musica.artista;
  capaAtual.src = musica.capa || "";

  if (musica.capa) {
    capaAtual.hidden = false;
  } else {
    capaAtual.hidden = true;
  }

  botaoPlay.disabled = false;
}

onValue(ref(database, "musicas"), function (resposta) {
  const dadosDoFirebase = resposta.val();
  musicas = [];

  if (dadosDoFirebase !== null) {
    for (const id in dadosDoFirebase) {
      const musica = dadosDoFirebase[id];
      musica.id = id;
      musicas.push(musica);
    }
  }

  popularFiltroGeneros();
  mostrarMusicas();
});

// Evento de busca com efeito de delay (debounce)
campoBusca.addEventListener("input", function () {
  clearTimeout(tempoDeEspera);
  tempoDeEspera = setTimeout(function () {
    mostrarMusicas();
  }, 250);
});

filtroGenero.addEventListener("change", function () {
  mostrarMusicas();
});

botaoInicio.addEventListener("click", function (evento) {
  evento.preventDefault();
  campoBusca.value = "";
  filtroGenero.value = "";
  mostrarMusicas();
});

// Botão Play / Pause
botaoPlay.addEventListener("click", function () {
  if (audioPlayer.paused) {
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
});

// Eventos do elemento de Áudio HTML
audioPlayer.addEventListener("play", function () {
  botaoPlay.textContent = "❚❚";
  botaoPlay.setAttribute("aria-label", "Pausar");
});

audioPlayer.addEventListener("pause", function () {
  botaoPlay.textContent = "▶";
  botaoPlay.setAttribute("aria-label", "Reproduzir");
});

audioPlayer.addEventListener("loadedmetadata", function () {
  tempoTotal.textContent = formatarTempo(audioPlayer.duration);
  barraProgresso.max = audioPlayer.duration || 100;
});

audioPlayer.addEventListener("timeupdate", function () {
  tempoAtual.textContent = formatarTempo(audioPlayer.currentTime);
  barraProgresso.value = audioPlayer.currentTime;
});

barraProgresso.addEventListener("input", function (evento) {
  audioPlayer.currentTime = Number(evento.target.value);
});

barraVolume.addEventListener("input", function (evento) {
  audioPlayer.volume = Number(evento.target.value);
});

// Avançar para a próxima música ao terminar
audioPlayer.addEventListener("ended", function () {
  // 1. Se existir uma música na fila manual
  if (filaDeReproducao.length > 0) {
    const proximaDaFila = filaDeReproducao.shift();
    atualizarFilaUI();
    tocarMusica(proximaDaFila);
    return;
  }

  // 2. Senão, avança na lista atual de músicas
  let listaParaTocar = musicas;
  if (filaDeMusicas.length > 0) {
    listaParaTocar = filaDeMusicas;
  }

  let indiceAtual = -1;
  for (let i = 0; i < listaParaTocar.length; i++) {
    if (musicaAtual && listaParaTocar[i].id === musicaAtual.id) {
      indiceAtual = i;
      break;
    }
  }

  if (indiceAtual !== -1 && indiceAtual < listaParaTocar.length - 1) {
    const proximaMusica = listaParaTocar[indiceAtual + 1];
    tocarMusica(proximaMusica);
  }
});
