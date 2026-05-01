import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { globalApi } from "../../services/globalApi";
import { useApiError } from "../hooks/useApiError";
import ErrorDisplay from "../hooks/ErrorDisplay ";
import { useFlow } from "./FlowContext";

export default function DetalleVale() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vale, setVale] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [apiError, setApiError] = useState(null);
  const { markStepComplete } = useFlow();
  const { error, handleApiError, clearError } = useApiError();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 8000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  useEffect(() => {
    if (!id) return;

    globalApi
      .obtenerDetalleVale(id)
      .then((res) => {
        const respuestaApi = res.data;

        if (respuestaApi && respuestaApi.error === 0 && respuestaApi.data) {
          setVale(respuestaApi.data);
          setApiError(null);
          return;
        }

        if (respuestaApi && respuestaApi.error === 1 && respuestaApi.data) {
          setVale(respuestaApi.data);
          setApiError({
            tipo: "api",
            mensaje:
              respuestaApi.resultado || "Error al obtener información completa",
            codigo: respuestaApi.error,
          });
          return;
        }

        setVale(null);
        setApiError({
          tipo: "sin_datos",
          mensaje: "No se encontró información con esta referencia",
        });
      })
      .catch((err) => {
        console.error("❌ Error de red:", err);
        handleApiError(err);
        setApiError({
          tipo: "red",
          mensaje: "Error de conexión. Intenta de nuevo.",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, handleApiError]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: "var(--verde-menta-claro)" }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-14 w-14 border-4 border-transparent"
            style={{ borderTopColor: "var(--teal-principal)", borderRightColor: "var(--azul-celeste-suave)" }}
          />
          <p className="text-sm font-semibold" style={{ color: "var(--teal-principal)" }}>
            Cargando información…
          </p>
        </div>
      </div>
    );
  }

  if (apiError?.tipo === "api") {
    return (
      <>
        <div
          className="min-h-screen flex flex-col items-center justify-center p-4"
          style={{ background: "linear-gradient(160deg, var(--verde-menta-claro) 0%, #e8f8f8 100%)" }}
        >
          <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden">
            <div
              className="p-6 text-white text-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
                style={{ background: "var(--teal-principal)", transform: "translate(30%, -30%)" }}
              />
              <div className="text-5xl mb-3">⚠️</div>
              <h1 className="text-2xl font-black tracking-tight">Proceso Incompleto</h1>
              <p className="text-amber-100 text-xs mt-2 break-all uppercase font-mono">
                REF: {id}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-l-4 p-4 rounded-xl" style={{ background: "#fffbeb", borderColor: "#f59e0b" }}>
                <p className="text-sm font-bold text-amber-800 mb-1">{apiError.mensaje}</p>
                <p className="text-xs text-amber-700">Los datos de tu solicitud están incompletos en el sistema.</p>
              </div>

              {vale?.leyenda && (
                <div
                  className="p-4 rounded-2xl border text-sm text-gray-700 leading-relaxed"
                  style={{ background: "var(--verde-menta-claro)", borderColor: "var(--azul-celeste-suave)" }}
                  dangerouslySetInnerHTML={{ __html: vale.leyenda }}
                />
              )}

              <div className="rounded-2xl p-4" style={{ background: "#f0fdf4" }}>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ background: "var(--teal-principal)" }}
                  >
                    📞
                  </span>
                  ¿Qué hacer?
                </h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  {[
                    <>Contacta a tu agente: <strong style={{ color: "var(--teal-principal)" }}>LUCIA ARIZMENDI CARDIEL</strong></>,
                    <>Proporciona tu referencia: <code className="bg-gray-200 px-2 py-0.5 rounded text-xs break-all">{id}</code></>,
                    "Espera confirmación para continuar con el proceso",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: "var(--verde-vibrante)" }}
                      >
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform text-sm"
                style={{ background: "linear-gradient(90deg, var(--teal-principal), var(--azul-celeste-suave))" }}
              >
                🔄 RECARGAR PÁGINA
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full font-bold py-4 rounded-2xl active:scale-95 transition-transform text-sm"
                style={{ background: "var(--verde-menta-claro)", color: "var(--teal-principal)" }}
              >
                ← VOLVER AL INICIO
              </button>
            </div>
          </div>
        </div>
        <ErrorDisplay error={error} onClose={clearError} />
      </>
    );
  }

  if (!vale || apiError?.tipo === "sin_datos") {
    return (
      <>
        <div
          className="min-h-screen flex flex-col items-center justify-center p-4"
          style={{ background: "linear-gradient(160deg, var(--verde-menta-claro) 0%, #e8f8f8 100%)" }}
        >
          <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-black text-red-500 mb-2">Referencia No Encontrada</h2>
            <p className="text-gray-500 text-sm mb-2">
              {apiError?.mensaje || "No se obtuvo información con la referencia proporcionada."}
            </p>
            <p className="text-xs text-gray-400 mb-6 font-mono break-all">REF: {id}</p>
            <button
              onClick={() => navigate("/")}
              className="text-white font-bold py-3 px-8 rounded-2xl shadow-lg active:scale-95 transition-transform text-sm"
              style={{ background: "linear-gradient(90deg, var(--teal-principal), var(--azul-celeste-suave))" }}
            >
              VOLVER AL INICIO
            </button>
          </div>
        </div>
        <ErrorDisplay error={error} onClose={clearError} />
      </>
    );
  }

  const esSoloLeyenda = id.startsWith("2") || id.startsWith("3") || id.startsWith("4");

  const manejarConfirmacion = () => {
    markStepComplete(id, "detalleVale");
    if (esSoloLeyenda) {
      markStepComplete(id, "capturaINE");
      setTimeout(() => navigate(`/captura-ine/${id}`), 100);
    } else {
      setTimeout(() => navigate(`/formulario/${id}`), 100);
    }
  };

  return (
    <>
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(160deg, var(--verde-menta-claro) 0%, #e2f6f6 100%)" }}
      >
        <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden">

          <div
            className="p-6 text-white text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--teal-principal) 0%, var(--azul-celeste-suave) 100%)" }}
          >
            <div
              className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20"
              style={{ background: "var(--verde-vibrante)" }}
            />
            <div
              className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-15"
              style={{ background: "white" }}
            />

            <div className="relative flex justify-center mb-3">
              <img src="/4592940a-0ab0-46f5-a80d-ddbc8776791b" alt="Logo ValeExpress" className="h-12 w-auto drop-shadow" />
            </div>

            <h1 className="text-xl font-black uppercase tracking-widest relative">
              {esSoloLeyenda ? "Firma de Contrato" : "Detalle de Vale"}
            </h1>
            <p className="text-xs mt-1 font-mono relative" style={{ color: "rgba(255,255,255,0.75)" }}>
              REF: {id}
            </p>
          </div>

          <div className="p-6 space-y-4">

            {!esSoloLeyenda && (
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--verde-menta-claro)" }}>
                {[
                  {
                    label: "Monto",
                    value: `$${Number(vale.monto).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                    large: true,
                  },
                  { label: "Plazos", value: vale.plazos },
                  vale.plazoTipo && { label: "Tipo de Plazo", value: vale.plazoTipo, accent: true },
                  {
                    label: "Seguro",
                    value: `$${Number(vale.seguro).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                  },
                  vale.fechaPrimerPago && {
                    label: "Fecha",
                    value: new Date(vale.fechaPrimerPago).toLocaleDateString("es-MX"),
                  },
                ]
                  .filter(Boolean)
                  .map((row, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center px-4 py-3"
                      style={{ background: i % 2 === 0 ? "white" : "var(--verde-menta-claro)" }}
                    >
                      <span className="text-gray-500 text-sm font-medium">{row.label}</span>
                      <span
                        className={`font-bold text-right ${row.large ? "text-xl" : "text-sm"}`}
                        style={{ color: row.accent ? "var(--teal-principal)" : "#1a1a2e" }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div
              className="rounded-2xl p-5 border"
              style={{ background: "var(--verde-menta-claro)", borderColor: "var(--azul-celeste-suave)" }}
            >
              <div
                className="w-10 h-1 rounded-full mb-3"
                style={{ background: "linear-gradient(90deg, var(--teal-principal), var(--verde-vibrante))" }}
              />
              {vale.leyenda ? (
                <div
                  className="text-sm text-gray-700 leading-relaxed dynamic-html"
                  dangerouslySetInnerHTML={{ __html: vale.leyenda }}
                />
              ) : (
                <p className="text-sm italic text-center" style={{ color: "var(--teal-principal)" }}>
                  Información autorizada.
                </p>
              )}
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={manejarConfirmacion}
                className="w-full text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wider relative overflow-hidden group"
                style={{ background: "linear-gradient(90deg, var(--teal-principal), var(--verde-vibrante))" }}
              >
                <span className="relative z-10">✓ SÍ, ES CORRECTA</span>
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-wider border-2"
                style={{
                  background: "transparent",
                  color: "var(--teal-principal)",
                  borderColor: "var(--azul-celeste-suave)",
                }}
              >
                ✕ NO
              </button>
            </div>
          </div>
        </div>
      </div>

      <ErrorDisplay error={error} onClose={clearError} />

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }

        .dynamic-html a       { color: var(--teal-principal); text-decoration: underline; }
        .dynamic-html strong  { color: var(--teal-principal); }
        .dynamic-html ul      { list-style: disc; padding-left: 1.2rem; margin-top: 0.5rem; }
        .dynamic-html li      { margin-bottom: 0.25rem; }
      `}</style>
    </>
  );
}