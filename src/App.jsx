import React, { useState } from "react";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw88pz4BJNUwwQJQ95yRcBjPiqjeIZFQMrRqR3o6T95eu5G1_1w1Juh8hd821QztneA/exec";

export default function App() {
  const [responsavel, setResponsavel] = useState("");
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState([
    { nome: "Porta fechada", status: "", fotoBase64: "", fotoMimeType: "" },
    { nome: "Lixeiras limpas", status: "", fotoBase64: "", fotoMimeType: "" },
    { nome: "Balanças limpas", status: "", fotoBase64: "", fotoMimeType: "" },
  ]);

  function setStatus(index, status) {
    const novos = [...items];
    novos[index].status = status;
    setItems(novos);
  }

  function handleFoto(index, file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const novos = [...items];
      novos[index].fotoBase64 = reader.result;
      novos[index].fotoMimeType = file.type || "image/jpeg";
      setItems(novos);
    };
    reader.readAsDataURL(file);
  }

  async function enviar() {
    if (!responsavel.trim()) {
      alert("Preencha o responsável");
      return;
    }

    const pendentes = items.filter((item) => !item.status);
    if (pendentes.length > 0) {
      alert("Responda todos os itens antes de enviar");
      return;
    }

    const payload = {
      responsavel,
      items,
    };

    try {
      setSending(true);

      const response = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Erro ao salvar");
      }

      alert(`Checklist enviado com sucesso. ${result.total} item(ns) gravados.`);

      setResponsavel("");
      setItems([
        { nome: "Porta fechada", status: "", fotoBase64: "", fotoMimeType: "" },
        { nome: "Lixeiras limpas", status: "", fotoBase64: "", fotoMimeType: "" },
        { nome: "Balanças limpas", status: "", fotoBase64: "", fotoMimeType: "" },
      ]);
    } catch (error) {
      alert("Erro ao enviar: " + error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
      <h1>Checklist BPF</h1>

      <input
        placeholder="Responsável"
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 20,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      {items.map((item, i) => (
        <div
          key={i}
          style={{
            marginBottom: 20,
            padding: 12,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 10,
          }}
        >
          <div style={{ marginBottom: 10, fontWeight: "bold" }}>{item.nome}</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setStatus(i, "SIM")}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: item.status === "SIM" ? "#16a34a" : "#fff",
                color: item.status === "SIM" ? "#fff" : "#000",
              }}
            >
              OK
            </button>

            <button
              onClick={() => setStatus(i, "NÃO")}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: item.status === "NÃO" ? "#d97706" : "#fff",
                color: item.status === "NÃO" ? "#fff" : "#000",
              }}
            >
              NOK
            </button>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFoto(i, e.target.files?.[0])}
            />
          </div>

          <div style={{ fontSize: 14, color: "#555" }}>
            Status: {item.status || "não preenchido"}
          </div>
          <div style={{ fontSize: 14, color: "#555" }}>
            Foto: {item.fotoBase64 ? "anexada" : "sem foto"}
          </div>
        </div>
      ))}

      <button
        onClick={enviar}
        disabled={sending}
        style={{
          width: "100%",
          marginTop: 20,
          padding: 14,
          borderRadius: 10,
          border: "none",
          background: "#111827",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {sending ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}
