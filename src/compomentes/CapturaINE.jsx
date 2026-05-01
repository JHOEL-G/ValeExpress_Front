import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle,
  Loader2,
  Camera,
  Upload,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { globalApi } from "../../services/globalApi";
import { useNavigate, useParams } from "react-router";
import imageCompression from "browser-image-compression";
import { useFlow } from "./FlowContext";

export default function CapturaINE() {
  const [step, setStep] = useState(1);
  const [fotoIneFrontal, setFotoIneFrontal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const { markStepComplete } = useFlow();
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopStream();
    setError(null);
    setCameraReady(false);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
        streamRef.current = mediaStream;
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const compressImage = async (fileOrDataUrl) => {
    let file;
    if (typeof fileOrDataUrl === "string") {
      const response = await fetch(fileOrDataUrl);
      const blob = await response.blob();
      file = new File([blob], "imagen.jpg", { type: "image/jpeg" });
    } else {
      file = fileOrDataUrl;
    }

    try {
      return await imageCompression.getDataUrlFromFile(
        await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        })
      );
    } catch (error) {
      return fileOrDataUrl;
    }
  };

  const validarSoloFrente = async (imagenDataUrl) => {
    if (isProcessingRef.current) return; // ✅ guard
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      const respuesta = await globalApi.validarIdentidad(
        imagenDataUrl,
        imagenDataUrl,
        id || "temp_ref"
      );
      const info = respuesta?.data?.[0];
      setFotoIneFrontal(imagenDataUrl);
      setStep(3);
    } catch (err) {
      setError(err.message || "Error al validar el frente.");
    } finally {
      isProcessingRef.current = false; // ✅ liberar
      setIsProcessing(false);
    }
  };

  const validarReversoYFinalizar = async (imagenReversoUrl) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      const respuesta = await globalApi.validarIdentidad(
        fotoIneFrontal,
        imagenReversoUrl,
        id || "temp_ref"
      );
      const info = respuesta?.data?.[0];

      if (info && info.curp && info.nombres && !info.mrz) {
        // ✅ Solo setear el error, el finally libera el guard
        setError("Capturaste el frente otra vez. Por favor, gira la INE y captura el reverso (con el código MRZ).");
        return; // ✅ ahora sí es seguro porque finally siempre corre
      }

      if (info && info.estatus !== "ERROR" && info.mrz) {
        localStorage.setItem(`ocrData_${id}`, JSON.stringify(info));
        stopStream();
        setStep(5);
      } else {
        throw new Error(info?.mensaje || "No se pudo validar el reverso.");
      }
    } catch (err) {
      setError(err.message || "Error al validar el reverso.");
    } finally {
      isProcessingRef.current = false; // ✅ siempre se libera, con return o sin él
      setIsProcessing(false);
    }
  };

  const capturePhoto = async () => {
    // ✅ Doble check: ref inmediato + estado
    if (isProcessingRef.current || !videoRef.current || !canvasRef.current || !cameraReady) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg");
    const compressed = await compressImage(dataUrl);

    if (step === 2) await validarSoloFrente(compressed);
    else if (step === 3) await validarReversoYFinalizar(compressed);
  };


  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    if (step === 2) await validarSoloFrente(compressed);
    else if (step === 3) await validarReversoYFinalizar(compressed);
  };

  const reiniciarProceso = () => {
    isProcessingRef.current = false; // ✅ resetear al reiniciar
    setError(null);
    setFotoIneFrontal(null);
    setStep(1);
    stopStream();
  };

  useEffect(() => {
    if (step === 2 || step === 3) startCamera();
    return () => stopStream();
  }, [step]); // ahora sí solo se ejecuta cuando cambia step

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#f0fafa" }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {(step === 2 || step === 3) && (
        <div className="px-6 pt-10 pb-5 bg-white shadow-sm">
          <h2 className="text-xl font-bold text-center mb-4" style={{ color: "#1a2e2e" }}>
            Captura {step === 2 ? "el frente" : "el reverso"} de tu INE
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-md text-white"
              style={{ background: "linear-gradient(135deg, #56BDBC, #9DD9DC)" }}
            >
              1
            </div>
            <div
              className="h-1 w-12 rounded-full"
              style={{ background: step >= 3 ? "linear-gradient(90deg, #56BDBC, #7CDC55)" : "#D3F0DC" }}
            />
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-md"
              style={{
                background: step >= 3 ? "linear-gradient(135deg, #56BDBC, #9DD9DC)" : "#D3F0DC",
                color: step >= 3 ? "white" : "#56BDBC",
              }}
            >
              2
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 relative">
        {step === 1 && (
          <div className="flex flex-col justify-between h-full px-6 py-10">
            <div>
              <h1 className="text-3xl font-extrabold mb-3" style={{ color: "#1a2e2e" }}>
                Validación<br />de Identidad
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "#5a7a7a" }}>
                Prepara tu INE original. Tomaremos fotos claras del frente y reverso.
              </p>
            </div>

            <div className="rounded-3xl p-6 bg-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "#8aabab" }}>
                Cómo funciona
              </p>
              {[
                { num: "1", label: "Frente de tu INE", desc: "Foto clara del lado con tu foto" },
                { num: "2", label: "Reverso de tu INE", desc: "El lado con código de barras MRZ" },
                { num: "3", label: "Verificación", desc: "Validamos tu identidad al instante" },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-4 ${i < 2 ? "mb-4" : ""}`}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                    style={{ background: "#D3F0DC", color: "#56BDBC" }}
                  >
                    {item.num}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#1a2e2e" }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7a9999" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
            >
              Comenzar captura
            </button>
          </div>
        )}

        {(step === 2 || step === 3) && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Scan corners overlay */}
            {!isProcessing && cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative" style={{ width: "85%", aspectRatio: "1.586" }}>
                  {/* Esquinas */}
                  {[
                    "top-0 left-0 border-t-2 border-l-2 rounded-tl-xl",
                    "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl",
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl",
                  ].map((cls, i) => (
                    <div
                      key={i}
                      className={`absolute w-7 h-7 ${cls}`}
                      style={{ borderColor: "#7CDC55" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Hint label */}
            {!isProcessing && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
                <p className="text-white text-xs font-medium whitespace-nowrap">
                  {step === 2 ? "Centra el frente de tu INE" : "Muestra el reverso con código MRZ"}
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: "rgba(240,250,250,0.96)" }}>
                <Loader2
                  className="w-16 h-16 animate-spin mb-4"
                  style={{ color: "#56BDBC" }}
                />
                <p className="text-xl font-bold" style={{ color: "#1a2e2e" }}>
                  Analizando {step === 2 ? "frente" : "reverso"}...
                </p>
                <p className="text-sm mt-1" style={{ color: "#7a9999" }}>
                  Esto solo toma un momento
                </p>
              </div>
            )}
          </>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center justify-between h-full px-6 py-16">
            <div className="flex flex-col items-center text-center">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-lg"
                style={{ background: "linear-gradient(135deg, #D3F0DC, #9DD9DC)" }}
              >
                <CheckCircle size={68} style={{ color: "#56BDBC" }} strokeWidth={2} />
              </div>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3"
                style={{ background: "#D3F0DC", color: "#2d8a5e" }}
              >
                Identidad verificada
              </span>
              <h1 className="text-2xl font-extrabold mb-3" style={{ color: "#1a2e2e" }}>
                ¡Todo listo!
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "#5a7a7a", maxWidth: 280 }}>
                Tu INE ha sido validada correctamente. Puedes continuar.
              </p>
            </div>

            <button
              onClick={() => {
                markStepComplete(id, "capturaINE");
                navigate(`/reconocimiento/${id}`, { state: { fotoIneFrontal } });
              }}
              className="w-full max-w-sm py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
            >
              Continuar proceso
            </button>
          </div>
        )}
      </main>

      {(step === 2 || step === 3) && (
        <div className="px-6 pb-8 pt-4 bg-white">
          <button
            onClick={capturePhoto}
            disabled={isProcessing || !cameraReady}
            className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
          >
            <Camera size={20} />
            Capturar foto
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {error && !isProcessing && (step === 2 || step === 3) && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-6" style={{ background: "rgba(10,30,30,0.5)" }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: "#fff0f0" }}>
                <AlertCircle size={48} style={{ color: "#e05252" }} />
              </div>
              <h3 className="text-xl font-extrabold mb-3" style={{ color: "#1a2e2e" }}>
                No se pudo validar
              </h3>
              <p className="text-sm leading-relaxed mb-7" style={{ color: "#5a7a7a" }}>
                {error}
              </p>
              <button
                onClick={reiniciarProceso}
                className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
              >
                <RotateCcw size={20} />
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}