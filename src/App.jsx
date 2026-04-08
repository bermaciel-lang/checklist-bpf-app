import React, { useMemo, useState } from "react";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw88pz4BJNUwwQJQ95yRcBjPiqjeIZFQMrRqR3o6T95eu5G1_1w1Juh8hd821QztneA/exec";

const SECTIONS = [
  {
    area: "SALA DE FRACIONAMENTO",
    items: [
      "Porta fechada",
      "Lixeiras vazias e limpas.",
      "Balanças limpas e em bom estado",
      "Bancada e utensílios limpos e em bom estado",
      "Preenchimento adequado da folha de pesagem",
    ],
  },
  {
    area: "CÂMARA FRIA",
    items: [
      "Temperatura adequada (max 7°C)",
      "Caixas plásticas identificadas",
      "Organização",
      "Pallets somente de plástico",
    ],
  },
  {
    area: "SALA DE HIGIENIZADOS",
    items: [
      "Uniforme limpo e completo",
      "Uso de touca e luva",
      "Bancadas, superfícies e utensílios limpos",
      "Lixeiras vazias com tampa e pedal",
      "Temperatura da sala",
      "Ausência de pragas ou vestígios",
      "Preenchimento adequado da folha de pesagem",
      "Organização",
    ],
  },
  {
    area: "ESTOQUE HIGIENIZADOS",
    items: [
      "Temperatura adequada das geladeiras (max 4°C)",
      "Itens devidamente identificados (fab/val/qtde)",
      "Sistema PVPS sendo aplicado",
      "Separação por tipo de produto",
      "Geladeira limpa",
    ],
  },
];

function buildInitialItems() {
  const list = [];
  let id = 1;

  SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      list.push({
        id: id++,
        area: section.area,
        item,
        status: "",
        observacao: "",
        fotoBase64: "",
        fotoMimeType: "",
        fotoPreview: "",
        open: false,
      });
    });
  });

  return list;
}

function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function todayInputValue() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [responsavel, setResponsavel] = useState("");
  const [dataChecklist, setDataChecklist] = useState(todayInputValue());
  const [items, setItems] = useState(buildInitialItems());
  const [sending, setSending] = useState(false);

  const total = items.length;
  const respondidos = items.filter((item) => item.status).length;
  const pendentes = items.filter((item) => !item.status).length;
  const naoConformes = items.filter((item) => item.status === "NÃO").length;
  const progresso = total ? Math.round((respondidos / total) * 100) : 0;

  const groupedSections = useMemo(() => {
    return SECTIONS.map((section) => {
      const sectionItems = items.filter((item) => item.area === section.area);
      const done = sectionItems.filter((item) => item.status).length;
      return {
        area: section.area,
        items: sectionItems,
        done,
        total: sectionItems.length,
      };
    });
  }, [items]);

  function updateItem(id, patch) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function setStatus(id, status) {
    updateItem(id, {
      status,
      open: status === "NÃO" ? true : undefined,
    });
  }

  async function handlePhoto(id, file) {
    if (!file) return;
    const base64 = await fileToBase64(file);

    updateItem(id, {
      fotoBase64: base64,
      fotoMimeType: file.type || "image/jpeg",
      fotoPreview: base64,
      open: true,
    });
  }

  function validate() {
    if (!responsavel.trim()) {
      return "Informe o responsável.";
    }

    if (!dataChecklist) {
      return "Informe a data.";
    }

    const pendente = items.find((item) => !item.status);
    if (pendente) {
      return `Responda todos os itens antes de enviar. Falta: ${pendente.item}`;
    }

    const naoConformeSemObs = items.find(
      (item) => item.status === "NÃO" && !item.observacao.trim()
    );
    if (naoConformeSemObs) {
      return `O item "${naoConformeSemObs.item}" está como Não conforme e precisa de descrição obrigatória.`;
    }

    return null;
  }

  async function enviar() {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    const payload = {
      data: dataChecklist,
      responsavel: responsavel.trim(),
      respostas: items.map((item) => ({
        area: item.area,
        item: item.item,
        conforme: item.status,
        observacao: item.observacao.trim(),
        fotoBase64: item.fotoBase64,
        fotoMimeType: item.fotoMimeType,
      })),
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
        throw new Error(result.error || "Erro ao salvar checklist.");
      }

      alert("Checklist enviado com sucesso.");

      setResponsavel("");
      setDataChecklist(todayInputValue());
      setItems(buildInitialItems());
    } catch (error) {
      alert("Erro ao enviar: " + error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 100 }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "#0f172a",
            color: "#fff",
            padding: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
          }}
        >
          <h1 style={{ margin: 0, textAlign: "center", fontSize: 28 }}>
            Check List BPF - Controle Diário
          </h1>

          <p
            style={{
              marginTop: 8,
              textAlign: "center",
              color: "#cbd5e1",
              textTransform: "capitalize",
            }}
          >
            {formatLongDate()}
          </p>

          <div
            style={{
              marginTop: 16,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              <span>Progresso</span>
              <strong>
                {respondidos}/{total}
              </strong>
            </div>

            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 999,
                background: "rgba(255,255,255,0.2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progresso}%`,
                  height: "100%",
                  background: "#fff",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <span
                style={{
                  background: "#fff",
                  color: "#111827",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Pendentes: {pendentes}
              </span>

              <span
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Não conformes: {naoConformes}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
              border: "1px solid #e5e7eb",
            }}
          >
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Responsável
            </label>
            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome do colaborador"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
              border: "1px solid #e5e7eb",
            }}
          >
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Data
            </label>
            <input
              type="date"
              value={dataChecklist}
              onChange={(e) => setDataChecklist(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                boxSizing: "border-box",
              }}
            />
          </div>

          {groupedSections.map((section) => (
            <div
              key={section.area}
              style={{
                background: "#fff",
                borderRadius: 18,
                marginBottom: 16,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 16,
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: 700,
                }}
              >
                <span>{section.area}</span>
                <span style={{ color: "#64748b" }}>
                  {section.done}/{section.total}
                </span>
              </div>

              {section.items.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    borderTop: index === 0 ? "1px solid #e5e7eb" : "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>{item.item}</div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setStatus(item.id, "SIM")}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: item.status === "SIM" ? "#16a34a" : "#f8fafc",
                        color: item.status === "SIM" ? "#fff" : "#111827",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Conforme
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatus(item.id, "NÃO")}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: item.status === "NÃO" ? "#d97706" : "#f8fafc",
                        color: item.status === "NÃO" ? "#fff" : "#111827",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Não conforme
                    </button>

                    <label
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      Tirar foto
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhoto(item.id, e.target.files?.[0])}
                      />
                    </label>
                  </div>

                  {item.status === "NÃO" && (
                    <div
                      style={{
                        marginBottom: 8,
                        color: "#b45309",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Descrição obrigatória para item não conforme
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { open: !item.open })}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      color: "#475569",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginBottom: item.open ? 12 : 0,
                    }}
                  >
                    {item.open ? "Ocultar detalhes" : "Adicionar observação"}
                  </button>

                  {item.open && (
                    <div>
                      <textarea
                        value={item.observacao}
                        onChange={(e) =>
                          updateItem(item.id, { observacao: e.target.value })
                        }
                        placeholder="Descreva o que foi observado"
                        style={{
                          width: "100%",
                          minHeight: 90,
                          borderRadius: 12,
                          border: "1px solid #d1d5db",
                          padding: 12,
                          boxSizing: "border-box",
                          resize: "vertical",
                        }}
                      />

                      {item.fotoPreview ? (
                        <img
                          src={item.fotoPreview}
                          alt={item.item}
                          style={{
                            width: "100%",
                            marginTop: 12,
                            borderRadius: 12,
                            maxHeight: 240,
                            objectFit: "cover",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            marginTop: 12,
                            height: 120,
                            borderRadius: 12,
                            border: "1px dashed #cbd5e1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#64748b",
                            fontSize: 14,
                          }}
                        >
                          Nenhuma foto anexada
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.96)",
            borderTop: "1px solid #e5e7eb",
            padding: 12,
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <button
              type="button"
              onClick={enviar}
              disabled={sending}
              style={{
                width: "100%",
                minHeight: 54,
                border: "none",
                borderRadius: 16,
                background: "#0f172a",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {sending ? "Enviando..." : "Enviar Checklist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
