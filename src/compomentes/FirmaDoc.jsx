/* eslint-disable no-unused-vars */
import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { globalApi } from "../../services/globalApi";
import { useFlow } from "./FlowContext";


export default function FirmaDoc({ referencia, ubicacion, onCerrar }) {
  const sigCanvas = useRef({});
  const [loading, setLoading] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [urlRedireccion, setUrlRedireccion] = useState("");
  const { markStepComplete } = useFlow();
  const [nombre, setNombre] = useState("Cliente Ejemplo");
  const [correo, setCorreo] = useState("cliente@ejemplo.com");
  const [coordenadas, setCoordenadas] = useState([1, 110, 220, 200, 60]);
  const [debeCertificar, setDebeCertificar] = useState(false);
  const [mostrarErrorFirma, setMostrarErrorFirma] = useState(false);

  const [canvasSize, setCanvasSize] = useState({
    width: 440,
    height: 200
  });

  const containerRef = useRef(null);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = (event) => {
      window.history.pushState(null, "", window.location.href);
      if (window.confirm("¿Deseas salir? Serás redirigido al inicio.")) {
        window.location.href = "/";
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const infoContrato = await globalApi.obtenerDocumentoContrato(referencia);

        const data = infoContrato.metadata?.data;

        const certificar = data?.certificar ?? 0;
        const debe = certificar === -1 || certificar === 0 || certificar === 1;

        setDebeCertificar(debe);

        console.log(`📋 Certificar = ${certificar} → ${debe ? 'SÍ certificar' : 'NO certificar'}`);

        if (data) {
          if (data.pagare?.firmas) {
            const f = data.pagare.firmas;

            const nombreDB = f.socioNombre || f.clienteNombre || "";
            if (nombreDB && nombreDB.trim() !== "" && !nombreDB.includes("{")) {
              setNombre(nombreDB);
            }

            const correoDB = f.socioCorreo || f.clienteCorreo || "";
            if (correoDB && correoDB.trim() !== "" && !correoDB.includes("demo@")) {
              setCorreo(correoDB);
            }

            const coordenadasDB = f.socioCoordenadas || f.clienteCoordenadas || f.aval1Coordenadas;
            if (coordenadasDB) {
              try {
                const coords = typeof coordenadasDB === "string" ? JSON.parse(coordenadasDB) : coordenadasDB;
                setCoordenadas(coords);
              } catch (e) {
                console.warn("⚠️ Error parseando coordenadas, usando default:", e);
              }
            }
          } else if (data.poliza) {
            if (data.poliza.nombre && data.poliza.nombre.trim() !== "" && !data.poliza.nombre.includes("{")) {
              setNombre(data.poliza.nombre);
            }

            if (data.poliza.correo && data.poliza.correo.trim() !== "") {
              setCorreo(data.poliza.correo);
            }

            if (data.poliza.coordenadas) {
              try {
                const coords = typeof data.poliza.coordenadas === "string" ? JSON.parse(data.poliza.coordenadas) : data.poliza.coordenadas;
                setCoordenadas(coords);
              } catch (e) {
                console.warn("⚠️ Error parseando coordenadas de poliza:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Error cargando metadatos iniciales:", error);
      }
    };
    fetchMetadata();
  }, [referencia]);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = Math.min(440, containerWidth);

        if (Math.abs(newWidth - canvasSize.width) > 5) {
          setCanvasSize({
            width: newWidth,
            height: 200
          });

          setTimeout(() => {
            if (sigCanvas.current) {
              sigCanvas.current.clear();
            }
          }, 100);
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    setTimeout(updateCanvasSize, 100);

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const getTrimmedCanvasManual = () => {
    if (!sigCanvas.current) return null;

    const canvas = sigCanvas.current.getCanvas();
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 0) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor(i / 4 / canvas.width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (minX >= maxX || minY >= maxY) return canvas;

    const width = maxX - minX + 10;
    const height = maxY - minY + 10;
    const trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = width;
    trimmedCanvas.height = height;
    const trimmedCtx = trimmedCanvas.getContext("2d");

    trimmedCtx.fillStyle = "#ffffff";
    trimmedCtx.fillRect(0, 0, width, height);
    trimmedCtx.drawImage(canvas, minX - 5, minY - 5, width, height, 0, 0, width, height);

    return trimmedCanvas;
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const comprimirFirma = (dataUrl, maxWidth = 300, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let width = img.width, height = img.height;
        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = dataUrl;
    });
  };

  // Función para mostrar el modal de confirmación
  const handleClickFinalizar = () => {
    if (!nombre || nombre.trim() === "" || !correo || correo.trim() === "") {
      alert("Por favor, introduce un nombre y correo válido antes de firmar.");
      return;
    }

    const trimmed = getTrimmedCanvasManual();
    if (!trimmed || trimmed.toDataURL().length < 3000) {
      setMostrarErrorFirma(true); // En lugar de alert
      return;
    }

    if (!ubicacion || !ubicacion.latitud || !ubicacion.longitud) {
      alert("No se pudo obtener tu ubicación. Por favor, intenta nuevamente.");
      return;
    }

    // Mostrar modal de confirmación
    setMostrarConfirmacion(true);
  };

  const ejecutarFirma = async () => {
    // Cerrar modal de confirmación
    setMostrarConfirmacion(false);

    const trimmed = getTrimmedCanvasManual();

    setLoading(true);
    try {
      const respuestaPdf = await globalApi.obtenerPdfContrato(referencia);
      const pdfBase64String = respuestaPdf.doc;

      console.log("📄 Tipo de pdfBase64String:", typeof pdfBase64String);
      console.log("📄 Longitud de pdfBase64String:", pdfBase64String?.length);

      if (!pdfBase64String || typeof pdfBase64String !== 'string') {
        throw new Error("El PDF no se recibió correctamente del servidor");
      }

      const firmas = respuestaPdf.firmas;

      console.log("📋 Datos de firmas obtenidos desde obtenerPdfContrato:", firmas);

      // ✅ Procesar la firma del canvas
      const firmaOriginal = trimmed.toDataURL("image/png");
      console.log("✍️ Firma original generada, longitud:", firmaOriginal?.length);

      const firmaComprimida = await comprimirFirma(firmaOriginal, 300, 0.7);
      console.log("🗜️ Firma comprimida, longitud:", firmaComprimida?.length);

      // ✅ Extraer solo la parte base64 (sin el prefijo data:image/jpeg;base64,)
      const firmaImgBase64 = firmaComprimida.split(",")[1];
      console.log("📦 Firma en base64 extraída, longitud:", firmaImgBase64?.length);
      console.log("📦 Primeros 50 caracteres de firma:", firmaImgBase64?.substring(0, 50));

      if (!firmaImgBase64 || firmaImgBase64.length < 100) {
        throw new Error("La firma no se procesó correctamente");
      }

      // ✅ Función para limpiar base64 (eliminar prefijos si existen)
      const limpiarBase64 = (base64String) => {
        if (!base64String) return "";
        // Si tiene prefijo data:image, quitarlo
        if (base64String.includes(",")) {
          return base64String.split(",")[1];
        }
        return base64String;
      };

      // Función para descargar imagen de URL y convertir a base64
      const descargarImagenComoBase64 = async (url) => {
        try {
          console.log("🔗 Intentando descargar imagen desde:", url);

          const response = await fetch(url);

          console.log("📡 Response status:", response.status);
          console.log("📡 Response content-type:", response.headers.get('content-type'));

          // ✅ Verificar que sea una imagen
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.startsWith('image/')) {
            throw new Error(`La URL no devuelve una imagen. Content-Type: ${contentType}`);
          }

          if (!response.ok) {
            throw new Error(`Error al descargar imagen: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          console.log("📦 Blob obtenido, tipo:", blob.type, "tamaño:", blob.size);

          const base64 = await blobToBase64(blob);
          const base64Limpio = limpiarBase64(base64);

          console.log("📥 Imagen descargada y convertida a base64, longitud:", base64Limpio?.length);
          console.log("📥 Primeros 50 caracteres:", base64Limpio?.substring(0, 50));

          // ✅ Validación adicional: verificar que no sea HTML
          if (base64Limpio.startsWith('PCFkb2N0') || base64Limpio.startsWith('PCFET0')) {
            throw new Error('La imagen descargada es HTML, no una imagen válida');
          }

          return base64Limpio;
        } catch (error) {
          console.error("❌ Error descargando imagen:", error);
          console.error("❌ URL problemática:", url);
          throw error;
        }
      };

      const firmantes = [];
      const tipoId = referencia.charAt(0);

      // Definir firmaPath según el tipo de referencia
      let firmaPath = "firmaDvPagare"; // default
      if (tipoId === '1') {
        firmaPath = `${referencia}FirmaCf`;
      } else if (tipoId === '2') {
        firmaPath = `${referencia}FirmaSocia`;
      } else if (tipoId === '3' || tipoId === '4') {
        firmaPath = `${referencia}FirmaAval`;
      }

      if (firmas) {
        if (tipoId === '1') {
          console.log("📋 Tipo 1 detectado: Solo Socio");

          firmantes.push({
            nombreCompleto: firmas.socioNombre,
            correoElectronico: firmas.socioCorreo,
            firma: {
              imagen: firmaImgBase64,
              ubicacion: typeof firmas.socioCoordenadas === "string"
                ? JSON.parse(firmas.socioCoordenadas)
                : firmas.socioCoordenadas || [187, 309, 426, 395, 0],
            },
          });

        } else if (tipoId === '2') {
          console.log("📋 Tipo 2 detectado: Socio + opcionalmente Aval1");

          firmantes.push({
            nombreCompleto: firmas.socioNombre,
            correoElectronico: firmas.socioCorreo,
            firma: {
              imagen: firmaImgBase64,
              ubicacion: typeof firmas.socioCoordenadas === "string"
                ? JSON.parse(firmas.socioCoordenadas)
                : firmas.socioCoordenadas || [187, 309, 426, 395, 0],
            },
          });

          if (firmas.aval1Nombre &&
            firmas.aval1Nombre.trim() !== '' &&
            firmas.socioNombre === firmas.aval1Nombre) {
            console.log("📋 Aval1 detectado y coincide con Socio - Duplicando firma");
            firmantes.push({
              nombreCompleto: firmas.aval1Nombre,
              correoElectronico: firmas.aval1Correo,
              firma: {
                imagen: firmaImgBase64,
                ubicacion: typeof firmas.aval1Coordenadas === "string"
                  ? JSON.parse(firmas.aval1Coordenadas)
                  : firmas.aval1Coordenadas || [187, 309, 426, 395, 0],
              },
            });
          } else if (firmas.aval1Nombre && firmas.aval1Nombre.trim() !== '') {
            console.log("⚠️ Aval1 existe pero NO coincide con Socio - No se duplica");
          }

        } else if (tipoId === '3' || tipoId === '4') {
          console.log(`📋 Tipo ${tipoId} detectado: Procesando firmas previas y nuevas`);

          // ✅ Verificar que exista la firma previa del socio
          if (!firmas.socioFirmaUrl) {
            throw new Error('Falta la URL de la firma previa del socio');
          }

          console.log("📥 Descargando firma previa del socio...");
          console.log("🔗 URL Socio:", firmas.socioFirmaUrl);

          const socioFirmaBase64 = await descargarImagenComoBase64(firmas.socioFirmaUrl);

          // ✅ Agregar socio con su firma PREVIA (descargada)
          firmantes.push({
            nombreCompleto: firmas.socioNombre,
            correoElectronico: firmas.socioCorreo,
            firma: {
              imagen: socioFirmaBase64,
              ubicacion: typeof firmas.socioCoordenadas === "string"
                ? JSON.parse(firmas.socioCoordenadas)
                : firmas.socioCoordenadas || [187, 309, 426, 395, 0],
            },
          });

          // ✅ AVAL1: Verificar si ya firmó antes o firma ahora
          if (firmas.aval1Nombre && firmas.aval1Nombre.trim() !== '') {
            let aval1FirmaImagen;

            if (firmas.aval1FirmaUrl) {
              // Aval1 YA firmó antes, descargar su firma
              console.log("📥 Descargando firma previa del aval1...");
              console.log("🔗 URL Aval1:", firmas.aval1FirmaUrl);
              aval1FirmaImagen = await descargarImagenComoBase64(firmas.aval1FirmaUrl);
              console.log("✅ Aval1 usa firma previa descargada");
            } else {
              // Aval1 firma AHORA con el canvas
              console.log("📋 Aval1 firma ahora con el canvas");
              aval1FirmaImagen = firmaImgBase64;
            }

            firmantes.push({
              nombreCompleto: firmas.aval1Nombre,
              correoElectronico: firmas.aval1Correo,
              firma: {
                imagen: aval1FirmaImagen,
                ubicacion: typeof firmas.aval1Coordenadas === "string"
                  ? JSON.parse(firmas.aval1Coordenadas)
                  : firmas.aval1Coordenadas || [187, 309, 426, 395, 0],
              },
            });
          }

          // ✅ TIPO 4: Agregar aval2
          if (tipoId === '4' && firmas.aval2Nombre && firmas.aval2Nombre.trim() !== '') {
            console.log("📋 Tipo 4: Procesando aval2...");
            let aval2FirmaImagen;

            if (firmas.aval2FirmaUrl) {
              // Aval2 YA firmó antes, descargar su firma
              console.log("📥 Descargando firma previa del aval2...");
              console.log("🔗 URL Aval2:", firmas.aval2FirmaUrl);
              aval2FirmaImagen = await descargarImagenComoBase64(firmas.aval2FirmaUrl);
              console.log("✅ Aval2 usa firma previa descargada");
            } else {
              // Aval2 firma AHORA con el canvas
              console.log("📋 Aval2 firma ahora con el canvas");
              aval2FirmaImagen = firmaImgBase64;
            }

            firmantes.push({
              nombreCompleto: firmas.aval2Nombre,
              correoElectronico: firmas.aval2Correo,
              firma: {
                imagen: aval2FirmaImagen,
                ubicacion: typeof firmas.aval2Coordenadas === "string"
                  ? JSON.parse(firmas.aval2Coordenadas)
                  : firmas.aval2Coordenadas || [187, 309, 426, 395, 0],
              },
            });
          }
        }
      }

      if (firmantes.length === 0) {
        console.log("⚠️ No se detectaron firmantes en metadata, usando datos del formulario");
        firmantes.push({
          nombreCompleto: nombre,
          correoElectronico: correo,
          firma: {
            imagen: firmaImgBase64,
            ubicacion: coordenadas,
          },
        });
      }

      console.log(`✅ Total firmantes: ${firmantes.length}`);

      // ✅ Validar que todas las imágenes sean base64 puro (sin prefijos)
      firmantes.forEach((f, idx) => {
        const img = f.firma.imagen;
        console.log(`\n🔍 FIRMANTE ${idx}:`);
        console.log(`   Nombre: ${f.nombreCompleto}`);
        console.log(`   Correo: ${f.correoElectronico}`);
        console.log(`   Imagen length: ${img?.length}`);
        console.log(`   Primeros 50 chars: ${img?.substring(0, 50)}`);
        console.log(`   Últimos 50 chars: ${img?.substring(img.length - 50)}`);
        console.log(`   Tiene prefijo data:? ${img?.startsWith('data:')}`);
        console.log(`   Ubicación:`, f.firma.ubicacion);

        if (img.startsWith('data:')) {
          console.error(`   ❌ ADVERTENCIA: Firmante ${idx} tiene prefijo data: en la imagen!`);
          f.firma.imagen = limpiarBase64(img);
          console.log(`   ✅ Corregido, nueva longitud: ${f.firma.imagen.length}`);
        }
      });

      // ✅ Log del JSON completo que se enviará
      console.log("\n📤 ===== PAYLOAD COMPLETO A ENVIAR =====");
      console.log(JSON.stringify({
        referenciaId: referencia,
        pdfDocBase64: pdfBase64String?.substring(0, 100) + "...",
        firmantes: firmantes.map(f => ({
          nombreCompleto: f.nombreCompleto,
          correoElectronico: f.correoElectronico,
          firma: {
            imagen: f.firma.imagen?.substring(0, 100) + "...",
            ubicacion: f.firma.ubicacion
          }
        }))
      }, null, 2));
      console.log("========================================\n");

      let contratoFirmaData = null;

      if (debeCertificar) {
        console.log(`🔐 Certificando documento con ${firmantes.length} firmante(s)...`);

        const datosParaFirmar = {
          referenciaId: referencia,
          pdfDocBase64: pdfBase64String,
          firmantes: firmantes,
        };

        console.log("📤 Enviando datos para firmar:", {
          referenciaId: referencia,
          pdfLongitud: pdfBase64String?.length,
          firmantesCount: firmantes.length
        });

        const resFirma = await globalApi.firmarDocumento(datosParaFirmar);

        if (resFirma.error !== 0 || !resFirma.data || resFirma.data.length === 0) {
          throw new Error(resFirma.data?.[0]?.mensaje || "Error al firmar documento");
        }

        const firmaData = resFirma.data[0];

        if (firmaData.estatus !== "OK") {
          throw new Error(firmaData.mensaje || "El documento no se firmó correctamente");
        }

        contratoFirmaData = {
          error: Number(resFirma.error),
          resultado: String(resFirma.resultado),
          data: [{
            claveMensaje: Number(firmaData.claveMensaje || 0),
            codigoValidacion: String(firmaData.codigoValidacion || ""),
            estatus: String(firmaData.estatus || ""),
            hash: String(firmaData.hash || ""),
            nom151: String(firmaData.nom151 || ""),
            pdfFirmado: String(firmaData.pdfFirmado || ""),
            representacionVisual: String(firmaData.representacionVisual || ""),
          }],
        };
      } else {
        console.log("ℹ️ No requiere certificación NOM151 (certificar = 0)");
      }

      const payloadRegistroFinal = {
        latitud: Number(ubicacion.latitud),
        logitud: Number(ubicacion.longitud),
        firma: `data:image/jpeg;base64,${firmaImgBase64}`,
        firmaPath: firmaPath,
        certificaDocumento: debeCertificar,
        tmpRegistrarDB: true,
      };

      if (contratoFirmaData) {
        payloadRegistroFinal.contratoFirma = contratoFirmaData;
      }

      const resRegistro = await globalApi.obtenerUrlContratoFinal(referencia, payloadRegistroFinal);

      const textoMostrar = resRegistro.data?.textoMostrar || "¡Documento firmado y registrado correctamente!";
      const url = resRegistro.data?.url || "";

      markStepComplete(referencia, "firmaDoc");
      console.log("✅ Paso 'firmaDoc' marcado como completado para referencia:", referencia);

      setMensajeExito(textoMostrar);
      setUrlRedireccion(url);
      setMostrarExito(true);
    } catch (error) {
      console.error("❌ Error en el proceso de firma:", error);
      console.error("❌ Detalles del error:", error.response?.data || error.message);
      alert(`Ocurrió un error: ${error.message || "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const limpiarCanvas = () => {
    sigCanvas.current.clear();
  };

  const handleCerrarExito = () => {
    if (urlRedireccion) {
      window.location.href = urlRedireccion;
    } else {
      window.location.href = "/";
    }
  };

  return (
    <>
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h3 style={{ marginBottom: "10px", fontSize: "clamp(18px, 5vw, 22px)" }}>
          Dibuja tu firma
        </h3>

        {ubicacion ? (
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px", wordBreak: "break-word" }}>
            📍 Ubicación obtenida: Lat {ubicacion.latitud.toFixed(6)}, Lon {ubicacion.longitud.toFixed(6)}
          </div>
        ) : (
          <div style={{
            fontSize: "14px",
            color: "#dc2626",
            marginBottom: "15px",
            padding: "12px",
            background: "#fef2f2",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            maxWidth: "440px",
            margin: "0 auto 15px"
          }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span>Por favor, activa tu ubicación para continuar</span>
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            border: "2px solid #2563eb",
            borderRadius: "8px",
            background: "white",
            maxWidth: "440px",
            width: "calc(100% - 20px)",
            margin: "0 auto",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            position: "relative",
          }}
        >
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: canvasSize.width,
              height: canvasSize.height,
              className: "signature-canvas",
              style: {
                touchAction: "none",
                cursor: "crosshair",
                display: "block",
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`,
                margin: 0,
                padding: 0,
              },
            }}
            backgroundColor="white"
            minWidth={1}
            maxWidth={3}
            velocityFilterWeight={0.7}
            throttle={16}
          />
        </div>

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => sigCanvas.current.clear()}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "white",
              minWidth: "100px",
            }}
          >
            Limpiar
          </button>
          <button
            onClick={handleClickFinalizar}
            disabled={loading || !ubicacion}
            style={{
              padding: "10px 20px",
              background: loading || !ubicacion ? "#ccc" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading || !ubicacion ? "not-allowed" : "pointer",
              minWidth: "150px",
              fontWeight: "bold",
            }}
          >
            {loading ? "Procesando..." : "Finalizar y Firmar"}
          </button>
        </div>
      </div>

      {/* Modal de Confirmación */}
      {mostrarConfirmacion && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9998,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px 25px",
            maxWidth: "420px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            animation: "slideIn 0.3s ease-out"
          }}>
            <div style={{
              width: "70px",
              height: "70px",
              background: "#FFA500",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 20px",
              fontSize: "46px",
              paddingBottom: "12px",
            }}>
              ⚠️
            </div>
            <h2 style={{
              color: "#333",
              marginBottom: "15px",
              fontSize: "22px",
              fontWeight: "bold"
            }}>
              ¿Estás seguro?
            </h2>
            <p style={{
              color: "#666",
              fontSize: "15px",
              lineHeight: "1.6",
              marginBottom: "30px"
            }}>
              Estás a punto de <strong>finalizar el proceso de firma</strong>. Una vez confirmado, no podrás realizar cambios.
            </p>
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center"
            }}>
              <button
                onClick={() => setMostrarConfirmacion(false)}
                style={{
                  padding: "12px 30px",
                  background: "#e5e7eb",
                  color: "#374151",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flex: 1
                }}
                onMouseEnter={(e) => (e.target.style.background = "#d1d5db")}
                onMouseLeave={(e) => (e.target.style.background = "#e5e7eb")}
              >
                No
              </button>
              <button
                onClick={ejecutarFirma}
                style={{
                  padding: "12px 30px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flex: 1
                }}
                onMouseEnter={(e) => (e.target.style.background = "#1d4ed8")}
                onMouseLeave={(e) => (e.target.style.background = "#2563eb")}
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Advertencia: Firma Vacía */}
      {mostrarErrorFirma && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999, // Un nivel más arriba por si acaso
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px 25px",
            maxWidth: "420px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              width: "70px",
              height: "70px",
              background: "#FEE2E2", // Rojo suave de fondo
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 20px",
              fontSize: "40px",
            }}>
              ✍️
            </div>
            <h2 style={{
              color: "#333",
              marginBottom: "15px",
              fontSize: "22px",
              fontWeight: "bold"
            }}>
              Firma requerida
            </h2>
            <p style={{
              color: "#666",
              fontSize: "15px",
              lineHeight: "1.6",
              marginBottom: "30px"
            }}>
              El recuadro de firma parece estar vacío o es demasiado corto. Por favor, <strong>dibuja tu firma</strong> claramente antes de continuar.
            </p>
            <button
              onClick={() => setMostrarErrorFirma(false)}
              style={{
                width: "100%",
                padding: "12px 30px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#1d4ed8")}
              onMouseLeave={(e) => (e.target.style.background = "#2563eb")}
            >
              Entendido, volver a intentar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {mostrarExito && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0, 0, 0, 0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "30px 20px", maxWidth: "500px", width: "100%", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ width: "80px", height: "80px", background: "#4CAF50", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 20px", fontSize: "40px", color: "white" }}>✓</div>
            <h2 style={{ color: "#4CAF50", marginBottom: "20px", fontSize: "clamp(20px, 5vw, 24px)" }}>¡Felicidades!</h2>
            <div style={{ color: "#333", fontSize: "14px", lineHeight: "1.6", marginBottom: "30px", textAlign: "left" }} dangerouslySetInnerHTML={{ __html: mensajeExito }} />
            <button onClick={handleCerrarExito} style={{ background: "#282195", color: "white", border: "none", borderRadius: "12px", padding: "14px 40px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", width: "100%", transition: "background 0.3s" }} onMouseEnter={(e) => (e.target.style.background = "#1a1570")} onMouseLeave={(e) => (e.target.style.background = "#282195")}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}