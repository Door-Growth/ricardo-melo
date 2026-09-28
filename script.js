const whatsappLink = "https://api.whatsapp.com/send?phone=5511978300451&text=Oi%20%F0%9F%98%8A%20tudo%20bem%3F%20Gostaria%20de%20saber%20mais%20sobre%20os%20servi%C3%A7os%20e%20como%20posso%20come%C3%A7ar.";

document.querySelectorAll(".whatsapp-btn").forEach((button) => {
  button.href = whatsappLink;
  button.target = "_blank";
  button.rel = "noopener noreferrer";
});

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll('.faq button').forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest("article");
    const isOpen = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
    button.nextElementSibling.setAttribute("aria-hidden", String(!isOpen));
    button.querySelector("span").textContent = isOpen ? "−" : "+";
  });
});
