const senhaAdmin = "1234";
const botaoAdmin = document.querySelector("#adm");

botaoAdmin.addEventListener("click", function () {
  const senha = prompt("Digite a senha do Espaço ADM:");

  if (senha === null) return;

  if (senha !== senhaAdmin) {
    alert("Senha incorreta.");
    return;
  }

  localStorage.setItem("spotifyAdminAllowed", "true");
  window.location.href = "./admin.html";
});
