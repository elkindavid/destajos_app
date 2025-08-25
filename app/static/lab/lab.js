// app/static/lab/lab.js

// 1) addEventListener básico
document.getElementById("btn-alert")?.addEventListener("click", () => {
  alert("¡Diste clic! addEventListener funciona 👌");
});

// 2) Input en vivo
const nameInput = document.getElementById("name-input");
const namePreview = document.getElementById("name-preview");
nameInput?.addEventListener("input", () => {
  namePreview.textContent = nameInput.value.trim() || "(vacío)";
});

// 3) Fetch GET: ping
document.getElementById("btn-fetch")?.addEventListener("click", async () => {
  const out = document.getElementById("fetch-result");
  out.textContent = "Consultando /lab/api/ping ...";
  try {
    const res = await fetch("/lab/api/ping");
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});

// 4) Fetch POST: formulario
document.getElementById("echo-form")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget;
  const formData = new FormData(form);

  const out = document.getElementById("echo-result");
  out.textContent = "Enviando formulario a /lab/api/echo ...";

  try {
    const res = await fetch("/lab/api/echo", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});

// 4-b) Fetch POST: JSON explícito
document.getElementById("btn-echo-json")?.addEventListener("click", async () => {
  const out = document.getElementById("echo-result");
  out.textContent = "Enviando JSON a /lab/api/echo ...";
  try {
    const res = await fetch("/lab/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "CarboMax" })
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});

// 5) SQLite: init/insert
document.getElementById("btn-sqlite-init")?.addEventListener("click", async () => {
  const out = document.getElementById("sqlite-result");
  const nameBox = document.getElementById("sqlite-name");
  const name = (nameBox?.value || "").trim();

  out.textContent = "Creando tabla e insertando registro...";
  try {
    const res = await fetch("/lab/api/sqlite/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});

// 5-b) SQLite: listar
document.getElementById("btn-sqlite-list")?.addEventListener("click", async () => {
  const out = document.getElementById("sqlite-result");
  out.textContent = "Listando registros...";
  try {
    const res = await fetch("/lab/api/sqlite/list");
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});
