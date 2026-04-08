import { useState } from "react";

export default function App() {
  const [responsavel, setResponsavel] = useState("");
  const [items, setItems] = useState([
    { nome: "Porta fechada", status: "" },
    { nome: "Lixeiras limpas", status: "" },
    { nome: "Balanças limpas", status: "" },
  ]);

  function setStatus(index, status) {
    const novos = [...items];
    novos[index].status = status;
    setItems(novos);
  }

  function enviar() {
    if (!responsavel) {
      alert("Preencha o responsável");
      return;
    }

    console.log({
      responsavel,
      items,
    });

    alert("Enviado (simulação)");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Checklist BPF</h1>

      <input
        placeholder="Responsável"
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 20 }}
      />

      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 15 }}>
          <div>{item.nome}</div>
          <button onClick={() => setStatus(i, "OK")}>OK</button>
          <button onClick={() => setStatus(i, "NOK")}>NOK</button>
        </div>
      ))}

      <button onClick={enviar} style={{ marginTop: 20 }}>
        Enviar
      </button>
    </div>
  );
}
