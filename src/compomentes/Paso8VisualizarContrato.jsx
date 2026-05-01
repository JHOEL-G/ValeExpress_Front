import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Document, Page, pdfjs } from "react-pdf";
import { globalApi } from "../../services/globalApi";
import FirmaDoc from "./FirmaDoc";

// Configuración del worker - VERSIÓN FIJA
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;
import { useFlow } from "./FlowContext";


const Paso8VisualizarContrato = () => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ubicacion, setUbicacion] = useState(null);
  const { markStepComplete } = useFlow();

  const { id } = useParams();

  useEffect(() => {
    descargarContratoReal();
  }, [id]);

  const descargarContratoReal = async () => {
    try {
      setCargando(true);

      const respuesta = await globalApi.obtenerPdfContrato(id);

      // 1. Extraer el string específicamente de la propiedad .doc
      // Según tu consola, el base64 está en respuesta.doc
      let base64String = "";

      if (respuesta && respuesta.doc) {
        base64String = respuesta.doc;
      } else if (typeof respuesta === 'string') {
        base64String = respuesta;
      }

      if (!base64String) {
        throw new Error("No se encontró el contenido del PDF en la respuesta");
      }

      // 2. Limpieza del base64
      let base64Limpio = base64String.trim();

      // Eliminar prefijo si existe
      if (base64Limpio.startsWith("data:application/pdf;base64,")) {
        base64Limpio = base64Limpio.substring(28);
      }

      // Limpiar espacios y saltos de línea
      base64Limpio = base64Limpio.replace(/[\s\r\n]/g, "");

      setPdfBase64(base64Limpio);

      // 3. Conversión a blob (esto se mantiene igual)
      const byteCharacters = atob(base64Limpio);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

    } catch (error) {
      console.error("❌ Error al procesar PDF:", error);
      alert("Error al cargar el contrato: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleAbrirModal = async () => {
    markStepComplete(id, "vista");
    setIsModalOpen(true);
    try {
      const coords = await obtenerUbicacion();
      setUbicacion(coords);
    } catch (error) {
      console.error("No se pudo obtener la ubicación:", error);
    }
  };

  const obtenerUbicacion = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            timestamp: new Date().toISOString(),
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  if (cargando) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3>Cargando documento oficial...</h3>
        <p>Por favor espera un momento</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "100vh", background: "#f0fafa" }}
    >
      {/* HEADER */}
      <div
        className="flex-shrink-0 px-5 pt-8 pb-4"
        style={{ background: "#f0fafa" }}
      >
        <h3
          className="text-xl font-extrabold text-center"
          style={{ color: "#1a2e2e" }}
        >
          Contrato de Solicitud
        </h3>
      </div>

      {/* TOOLBAR */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-4 px-5 py-3 mx-5 mb-3 rounded-2xl shadow-sm"
        style={{ background: "white", border: "1px solid #D3F0DC" }}
      >
        <button
          onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition active:scale-90"
          style={{ background: "#D3F0DC", color: "#56BDBC" }}
        >
          −
        </button>
        <span
          className="text-sm font-bold w-12 text-center"
          style={{ color: "#1a2e2e" }}
        >
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(s + 0.25, 2))}
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition active:scale-90"
          style={{ background: "#D3F0DC", color: "#56BDBC" }}
        >
          +
        </button>
      </div>

      {/* VISUALIZADOR */}
      <div
        className="flex-1 overflow-auto flex flex-col items-center py-4 px-2"
        style={{ background: "#3a4a4a" }}
      >
        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => console.error("Error en PDF:", error)}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div
                key={`page_${index + 1}`}
                className="mb-3 rounded-xl overflow-hidden shadow-2xl"
              >
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            ))}
          </Document>
        )}
      </div>

      {/* BOTÓN DE ACCIÓN */}
      <div
        className="flex-shrink-0 px-5 py-5"
        style={{ background: "#f0fafa" }}
      >
        <button
          onClick={handleAbrirModal}
          className="w-full max-w-sm mx-auto py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)",
            display: "flex",
          }}
        >
          ✍️ Confirmar y Firmar
        </button>
      </div>

      {/* MODAL DE FIRMA */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "rgba(10,30,30,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="relative w-full rounded-3xl shadow-2xl overflow-y-auto"
            style={{
              background: "white",
              maxWidth: 500,
              maxHeight: "90vh",
              padding: "28px 20px 20px",
            }}
          >
            {/* Franja superior decorativa */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl"
              style={{ background: "linear-gradient(90deg, #56BDBC, #7CDC55)" }}
            />

            {/* Botón cerrar */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center font-bold text-base transition active:scale-90"
              style={{ background: "#D3F0DC", color: "#56BDBC" }}
            >
              ✕
            </button>

            <FirmaDoc
              referencia={id}
              ubicacion={ubicacion}
              pdfBase64={pdfBase64}
              onCerrar={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Paso8VisualizarContrato;