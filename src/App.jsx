import React, { useEffect, useMemo, useState } from "react";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw88pz4BJNUwwQJQ95yRcBjPiqjeIZFQMrRqR3o6T95eu5G1_1w1Juh8hd821QztneA/exec";

const STORAGE_COLABORADOR_KEY = "checklist_bpf_colaborador";

function todayInputValue() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateBR(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function fileToBase64(file, maxWidth = 1280, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getAreaStatus(area) {
  const total = area.itens.length;
  const done = area.itens.filter((item) => item.resposta?.conforme).length;

  if (done === 0) return "Não iniciada";
  if (done < total) return "Em andamento";
  return "Concluída";
}

function isFotoObrigatoriaAgora(item) {
  const conforme = item?.resposta?.conforme || "";
  return item?.fotoObrigatoria || conforme === "NÃO";
}

function isObservacaoObrigatoria(item) {
  const conforme = item?.resposta?.conforme || "";
  return conforme === "NÃO";
}

export default function App() {
  const [responsavel, setResponsavel] = useState("");
  const [responsavelConfirmado, setResponsavelConfirmado] = useState("");
  const [responsaveis, setResponsaveis] = useState([]);
  const [dataChecklist] = useState(todayInputValue());
  const [areas, setAreas] = useState([]);
  const [areaAberta, setAreaAberta] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvandoChave, setSalvandoChave] = useState("");
  const [erro, setErro] = useState("");

  const totalItens = useMemo(() => {
    return areas.reduce((acc, area) => acc + area.itens.length, 0);
  }, [areas]);

  const totalRespondidos = useMemo(() => {
    return areas.reduce((acc, area) => {
      return acc + area.itens.filter((item) => item.resposta?.conforme).length;
    }, 0);
  }, [areas]);

  async function carregarResponsaveis() {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "getResponsaveis",
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || "Erro ao carregar responsáveis.");
    }

    setResponsaveis(Array.isArray(result.responsaveis) ? result.responsaveis : []);
  } catch (error) {
    alert("Erro ao carregar responsáveis: " + error.message);
  }
}

useEffect(() => {
  carregarResponsaveis();
}, []);

useEffect(() => {
  if (responsaveis.length === 0) return;

  const colaboradorSalvo = localStorage.getItem(STORAGE_COLABORADOR_KEY) || "";

  if (!colaboradorSalvo) return;

  const existeNaLista = responsaveis.includes(colaboradorSalvo);
  if (!existeNaLista) return;

  setResponsavel(colaboradorSalvo);
  carregarChecklist(colaboradorSalvo);
}, [responsaveis]);

async function carregarChecklist(nomeResponsavel) {
if (!nomeResponsavel.trim()) {
  alert("Selecione o colaborador.");
  return;
}

  try {
    setLoading(true);
    setErro("");

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "getChecklistState",
        data: dataChecklist,
        responsavel: nomeResponsavel.trim(),
      }),
    });

    const texto = await response.text();
    console.log("RESPOSTA BRUTA BACKEND:", texto);

    let result;
    try {
      result = JSON.parse(texto);
    } catch {
      throw new Error("O backend não retornou JSON válido.");
    }

    console.log("JSON BACKEND:", result);

    if (!result.ok) {
      throw new Error(result.error || "Erro ao carregar checklist.");
    }

    const areasRecebidas = Array.isArray(result.areas) ? result.areas : [];
    console.log("AREAS RECEBIDAS:", areasRecebidas);

    const areasTratadas = areasRecebidas.map((area) => ({
      ...area,
      aberta: false,
      itens: (area.itens || []).map((item) => ({
        ...item,
        open: false,
        resposta: item.resposta
          ? {
              conforme: item.resposta.conforme || "",
              observacao: item.resposta.observacao || "",
              foto_url: item.resposta.foto_url || "",
              fotoBase64: "",
              fotoMimeType: "",
              fotoPreview: item.resposta.foto_url || "",
            }
          : {
              conforme: "",
              observacao: "",
              foto_url: "",
              fotoBase64: "",
              fotoMimeType: "",
              fotoPreview: "",
            },
      })),
    }));

    setAreas(areasTratadas);
    setResponsavelConfirmado(nomeResponsavel.trim());
    setResponsavel(nomeResponsavel.trim());

    if (areasTratadas.length > 0) {
  setAreaAberta("");
} else {
  setAreaAberta("");
  alert("O backend respondeu, mas não retornou nenhuma área para hoje.");
}
  } catch (error) {
    console.error(error);
    setErro(error.message);
    alert("Erro ao carregar: " + error.message);
  } finally {
    setLoading(false);
  }
}

  function toggleArea(nomeArea) {
    setAreaAberta((prev) => (prev === nomeArea ? "" : nomeArea));
  }

  function updateItem(areaName, itemName, patch) {
    setAreas((prev) =>
      prev.map((area) => {
        if (area.area !== areaName) return area;

        return {
          ...area,
          itens: area.itens.map((item) => {
            if (item.item !== itemName) return item;

            return {
              ...item,
              resposta: {
                ...item.resposta,
                ...patch,
              },
            };
          }),
        };
      })
    );
  }

  function toggleOrientacao(areaName, itemName) {
    setAreas((prev) =>
      prev.map((area) => {
        if (area.area !== areaName) return area;

        return {
          ...area,
          itens: area.itens.map((item) => {
            if (item.item !== itemName) return item;
            return { ...item, open: !item.open };
          }),
        };
      })
    );
  }

  function setStatus(areaName, itemName, status) {
    setAreas((prev) =>
      prev.map((area) => {
        if (area.area !== areaName) return area;

        return {
          ...area,
          itens: area.itens.map((item) => {
            if (item.item !== itemName) return item;

            return {
              ...item,
              resposta: {
                ...item.resposta,
                conforme: status,
              },
            };
          }),
        };
      })
    );
  }

  async function handlePhoto(areaName, itemName, file) {
    if (!file) return;

    const base64 = await fileToBase64(file, 7000, 0.4);

    setAreas((prev) =>
      prev.map((area) => {
        if (area.area !== areaName) return area;

        return {
          ...area,
          itens: area.itens.map((item) => {
            if (item.item !== itemName) return item;

            return {
              ...item,
              resposta: {
                ...item.resposta,
                fotoBase64: base64,
                fotoMimeType: "image/jpeg",
                fotoPreview: base64,
              },
            };
          }),
        };
      })
    );
  }

  function validarItem(item) {
    const conforme = item.resposta?.conforme || "";
    const observacao = item.resposta?.observacao || "";
    const fotoBase64 = item.resposta?.fotoBase64 || "";
    const fotoUrl = item.resposta?.foto_url || "";
    const precisaFoto = item.fotoObrigatoria || conforme === "NÃO";

    if (!conforme) {
      return `Marque Conforme ou Não conforme no item "${item.item}".`;
    }

    if (conforme === "NÃO" && !observacao.trim()) {
      return `Preencha a observação do item "${item.item}".`;
    }

    if (precisaFoto && !fotoBase64 && !fotoUrl) {
      return `Tire a foto do item "${item.item}".`;
    }

    return null;
  }

  async function salvarArea(areaName) {
    if (!responsavelConfirmado.trim()) {
  alert("Selecione o colaborador.");
  return;
}

    const area = areas.find((a) => a.area === areaName);
    if (!area) return;

    const itensRespondidos = area.itens.filter((item) => item.resposta?.conforme);

    if (itensRespondidos.length === 0) {
      alert("Nenhum item respondido nessa área.");
      return;
    }

    for (const item of itensRespondidos) {
      const erroValidacao = validarItem(item);
      if (erroValidacao) {
        alert(erroValidacao);
        return;
      }
    }

    try {
      setSalvandoChave(areaName);

      const response = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "saveChecklist",
          data: dataChecklist,
          responsavel: responsavelConfirmado,
          respostas: itensRespondidos.map((item) => ({
            area: areaName,
            item: item.item,
            conforme: item.resposta.conforme,
            observacao: item.resposta.observacao || "",
            foto: item.resposta.fotoBase64
              ? {
                  mimeType: item.resposta.fotoMimeType || "image/jpeg",
                  base64: item.resposta.fotoBase64,
                }
              : null,
          })),
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Erro ao salvar área.");
      }

      alert("Área salva com sucesso.");
      
    } catch (error) {
      alert("Erro ao salvar área: " + error.message);
    } finally {
      setSalvandoChave("");
    }
  }

  return (
    <div
      style={{
        background: "#f3f4f6",
        minHeight: "100vh",
        paddingBottom: 40,
      }}
    >
      <div style={{ maxWidth: 620, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            background: "#0f172a",
            color: "#fff",
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            Check list operação - Controle diário
          </h1>

          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              fontSize: 16,
              color: "#cbd5e1",
              fontWeight: 600,
            }}
          >
            Data: {formatDateBR(dataChecklist)}
          </div>
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
  Colaborador
</label>

<select
  value={responsavel}
  disabled={loading}
onChange={(e) => {
  const nome = e.target.value;
  setResponsavel(nome);

  if (nome) {
    localStorage.setItem(STORAGE_COLABORADOR_KEY, nome);
    carregarChecklist(nome);
  } else {
    localStorage.removeItem(STORAGE_COLABORADOR_KEY);
    setResponsavelConfirmado("");
    setAreas([]);
    setAreaAberta("");
  }
}}
  style={{
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    marginBottom: 12,
    background: "#fff",
  }}
>
  <option value="">Selecione o colaborador</option>
  {responsaveis.map((nome) => (
    <option key={nome} value={nome}>
      {nome}
    </option>
  ))}
</select>

{loading ? (
  <div
    style={{
      fontSize: 14,
      color: "#475569",
      fontWeight: 600,
      marginTop: -4,
      marginBottom: 4,
    }}
  >
    Carregando checklist...
  </div>
) : null}
</div>

        {totalItens > 0 ? (
          <div
            style={{
              marginBottom: 16,
              fontSize: 14,
              color: "#334155",
              fontWeight: 600,
            }}
          >
            Itens respondidos: {totalRespondidos}/{totalItens}
          </div>
        ) : null}

        {erro ? (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            {erro}
          </div>
        ) : null}

        {areas.map((area) => {
          const aberta = areaAberta === area.area;
          const status = getAreaStatus(area);

          return (
            <div
  key={area.area}
  style={{
    background: status === "Concluída" ? "#dfe8e2" : "#fff",
    borderRadius: 18,
    marginBottom: 16,
    border: status === "Concluída" ? "2px solid #93c5aa" : "1px solid #e5e7eb",
    overflow: "hidden",
  }}
>
              <button
  type="button"
  onClick={() => toggleArea(area.area)}
  style={{
    width: "100%",
    border: "none",
    background: status === "Concluída" ? "#d7e5da" : "#f8fafc",
    padding: 16,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "left",
  }}
>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{area.area}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
                    {area.itens.length} itens • {status}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  {aberta ? "−" : "+"}
                </div>
              </button>

              {aberta && (
  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                  {area.itens.map((item, index) => {
                    const fotoObrigatoriaAgora = isFotoObrigatoriaAgora(item);
                    const observacaoObrigatoria = isObservacaoObrigatoria(item);

                    return (
                      <div
  key={item.item}
  style={{
    padding: 14,
    marginBottom: 14,
    border: item.resposta?.conforme ? "2px solid #93c5aa" : "2px solid #cbd5e1",
    borderRadius: 14,
    background: item.resposta?.conforme ? "#dfe8e2" : "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  }}
>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 20,
                            marginBottom: 8,
                          }}
                        >
                          {item.item}
                        </div>

                        {fotoObrigatoriaAgora && (
                          <div
                            style={{
                              display: "inline-block",
                              background: "#fee2e2",
                              color: "#b91c1c",
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontSize: 12,
                              fontWeight: 700,
                              marginBottom: 12,
                            }}
                          >
                            Foto obrigatória
                          </div>
                        )}

                        {item.observacaoItem ? (
                          <div style={{ marginBottom: 12 }}>
                            <button
  type="button"
  onClick={() => toggleOrientacao(area.area, item.item)}
  style={{
    border: "none",
    background: item.open ? "#dbeafe" : "#2563eb",
    padding: "10px 14px",
    color: item.open ? "#1d4ed8" : "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    borderRadius: 12,
    display: "inline-block",
    fontSize: 14,
  }}
>
  {item.open ? "Ocultar orientação" : "Ver orientação"}
</button>

                            {item.open && (
                              <div
                                style={{
                                  marginTop: 10,
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 12,
                                  padding: 12,
                                  color: "#334155",
                                  lineHeight: 1.5,
                                }}
                              >
                                {item.observacaoItem}
                              </div>
                            )}
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 12,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setStatus(area.area, item.item, "SIM")}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 12,
                              border: "1px solid #d1d5db",
                              background:
                                item.resposta?.conforme === "SIM" ? "#16a34a" : "#f8fafc",
                              color:
                                item.resposta?.conforme === "SIM" ? "#fff" : "#111827",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Conforme
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatus(area.area, item.item, "NÃO")}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 12,
                              border: "1px solid #d1d5db",
                              background:
                                item.resposta?.conforme === "NÃO" ? "#d97706" : "#f8fafc",
                              color:
                                item.resposta?.conforme === "NÃO" ? "#fff" : "#111827",
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
    border: item.resposta?.fotoPreview
      ? "1px solid #cbd5e1"
      : fotoObrigatoriaAgora
      ? "2px solid #dc2626"
      : "1px solid #cbd5e1",
    background: item.resposta?.fotoPreview
      ? "#e5e7eb"
      : fotoObrigatoriaAgora
      ? "#fff1f2"
      : "#e5e7eb",
    color: item.resposta?.fotoPreview
      ? "#475569"
      : fotoObrigatoriaAgora
      ? "#991b1b"
      : "#475569",
    fontWeight: 800,
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
                              onChange={(e) =>
                                handlePhoto(area.area, item.item, e.target.files?.[0])
                              }
                            />
                          </label>

                          {item.resposta?.fotoPreview ? (
  <div
    style={{
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      background: "#e5e7eb",
      color: "#475569",
      fontWeight: 800,
      display: "inline-flex",
      alignItems: "center",
    }}
  >
    Foto já adicionada
  </div>
) : null}
                          
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 8,
                              color: observacaoObrigatoria ? "#b91c1c" : "#334155",
                            }}
                          >
                            {observacaoObrigatoria ? "Observação *" : "Observação"}
                          </label>

                          <textarea
  value={item.resposta?.observacao || ""}
  onChange={(e) =>
    updateItem(area.area, item.item, {
      observacao: e.target.value,
    })
  }
  placeholder="Descreva o que foi observado"
  rows={2}
  style={{
    width: "100%",
    minHeight: 48,
    height: 48,
    borderRadius: 12,
    border: observacaoObrigatoria
      ? "2px solid #f59e0b"
      : "1px solid #d1d5db",
    padding: "12px 12px",
    boxSizing: "border-box",
    resize: "none",
    fontSize: 16,
    lineHeight: 1.3,
  }}
/>
                        </div>

                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => salvarArea(area.area)}
                    disabled={salvandoChave === area.area}
                    style={{
                      width: "100%",
                      minHeight: 50,
                      border: "1px solid #0f172a",
                      borderRadius: 12,
                      background: "#fff",
                      color: "#0f172a",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {salvandoChave === area.area ? "Salvando..." : "Salvar área"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
