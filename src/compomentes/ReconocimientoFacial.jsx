import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Upload,
} from "lucide-react";
import { globalApi } from "../../services/globalApi";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogFooter
} from "@/compomentes/ui/alert-dialog";
import { useFlow } from "./FlowContext";



export default function ReconocimientoFacial() {
  const [step, setStep] = useState(1);
  const [stream, setStream] = useState(null);
  const [capturedFace, setCapturedFace] = useState(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionScore, setRecognitionScore] = useState(null);
  const [liveSimilarity, setLiveSimilarity] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const isProcessingRef = useRef(false);

  const { markStepComplete } = useFlow();

  const [errorDialog, setErrorDialog] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const fotoIneFrontal =
    location.state?.fotoIneFrontal || localStorage.getItem(`fotoIne_${id}`);

  useEffect(() => {
    if (!fotoIneFrontal) {
      alert("La sesión expiró. Por favor, captura tu INE de nuevo.");
      navigate(-1);
    }
  }, [fotoIneFrontal, navigate]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stream]);

  const requestCameraAccess = async () => {
    setIsLoadingCamera(true);
    setCameraActive(false);
    setLiveSimilarity(0);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          const playVideo = () => {
            videoRef.current.play().catch(() => { });
            setCameraActive(true);
          };
          videoRef.current.onloadedmetadata = playVideo;
        }
      }, 150);

      setIsLoadingCamera(false);
      setStep(3);
    } catch (error) {
      setIsLoadingCamera(false);
      setErrorDialog({
        isOpen: true,
        title: "Error de Cámara",
        message: "No se pudo acceder a la cámara. Verifica los permisos."
      });
    }
  };

  useEffect(() => {
    if (step !== 3 || !cameraActive || isProcessing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let simulationInterval = null;

    const startSimulation = () => {
      if (simulationInterval) clearInterval(simulationInterval);

      simulationInterval = setInterval(() => {
        setLiveSimilarity(prev => {
          if (prev < 85) {
            return prev + 1;
          }
          return prev;
        });
      }, 100);
    };

    const animateToTarget = (target) => {
      if (simulationInterval) clearInterval(simulationInterval);

      simulationInterval = setInterval(() => {
        setLiveSimilarity(prev => {
          if (prev < target) {
            return prev + 1;
          } else if (prev > target) {
            return prev - 1;
          } else {
            clearInterval(simulationInterval);
            return prev;
          }
        });
      }, 40);
    };

    intervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;

      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);

      const frameData = canvas.toDataURL("image/jpeg", 0.7);

      isProcessingRef.current = true;
      startSimulation();

      try {
        const resultado = await globalApi.validarIneSelfie(
          fotoIneFrontal,
          frameData,
          id
        );

        if (simulationInterval) clearInterval(simulationInterval);

        const errorCode = resultado?.error ?? resultado?.Error ?? null;

        if (errorCode === null || errorCode === 0 || errorCode === "0") {
          let similitudEncontrada = null;
          if (Array.isArray(resultado.data)) {
            for (let i = 0; i < resultado.data.length; i++) {
              if (resultado.data[i]?.similitud !== undefined) {
                similitudEncontrada = resultado.data[i].similitud;
                break;
              }
            }
          }

          const sim = similitudEncontrada ?? 0;

          if (sim > 0) {
            const roundedSim = Math.round(sim);
            animateToTarget(roundedSim);

            if (sim >= 90) {
              clearInterval(intervalRef.current);
              setTimeout(() => {
                if (simulationInterval) clearInterval(simulationInterval);
                capturePhoto();
              }, 1500);
            }
          }
        }
      } catch (err) {
        console.error("⚠️ Error:", err);
        if (simulationInterval) clearInterval(simulationInterval);
      } finally {
        isProcessingRef.current = false;
      }
    }, 1500);

    return () => {
      clearInterval(intervalRef.current);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [step, cameraActive, isProcessing, fotoIneFrontal, id]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const validationResult = validateLiveCaptureDetailed(canvas);

    if (!validationResult.isValid) {
      setErrorDialog({
        isOpen: true,
        title: "❌ Documento Detectado",
        message: validationResult.reason
      });
      return;
    }

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedFace(imageData);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    processValidation(imageData);
  };

  const validateLiveCaptureDetailed = (canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const data = imageData.data;

    let veryWhitePixels = 0;
    let sharpEdges = 0;
    let textLikePatterns = 0;

    const sampleRate = 6;
    const width = canvas.width;
    const height = canvas.height;

    for (let y = 0; y < height; y += sampleRate) {
      for (let x = 0; x < width; x += sampleRate) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = (r + g + b) / 3;

        if (brightness > 240 && Math.abs(r - g) < 5 && Math.abs(g - b) < 5) {
          veryWhitePixels++;
        }

        if (x > sampleRate && y > sampleRate) {
          const prevI = ((y - sampleRate) * width + (x - sampleRate)) * 4;
          const prevBrightness = (data[prevI] + data[prevI + 1] + data[prevI + 2]) / 3;
          const diff = Math.abs(brightness - prevBrightness);

          if (diff > 110) {
            sharpEdges++;
          }

          if (diff > 130 && diff < 200) {
            textLikePatterns++;
          }
        }
      }
    }

    const totalPixels = (width * height) / (sampleRate * sampleRate);
    const veryWhiteRatio = veryWhitePixels / totalPixels;
    const sharpEdgeRatio = sharpEdges / totalPixels;
    const textPatternRatio = textLikePatterns / totalPixels;

    const isScreen = (veryWhiteRatio > 0.10 && textPatternRatio > 0.04);

    if (isScreen) {
      return {
        isValid: false,
        reason: "🚫 Pantalla detectada. Por favor, usa tu rostro real y no una foto digital."
      };
    }

    if (veryWhiteRatio > 0.25 && sharpEdgeRatio > 0.05 && textPatternRatio > 0.025) {
      return {
        isValid: false,
        reason: "🚫 Se detectó un documento. Muestra tu rostro real."
      };
    }

    if (textPatternRatio > 0.035 && sharpEdgeRatio > 0.06) {
      return {
        isValid: false,
        reason: "🚫 Se detectó un documento impreso."
      };
    }

    if (sharpEdgeRatio > 0.08) {
      return {
        isValid: false,
        reason: "🚫 Objeto plano detectado (Foto o Documento)."
      };
    }

    return {
      isValid: true,
      reason: "Captura válida"
    };
  };

  const processValidation = async (selfieData) => {
    setIsProcessing(true);
    setStep(4);

    try {
      let resultado;
      try {
        resultado = await globalApi.validarIneSelfie(
          fotoIneFrontal,
          selfieData,
          id
        );
      } catch (apiError) {
        console.error("❌ Error en validarIneSelfie:", apiError);

        const mensajeError =
          apiError.response?.data?.resultado ||
          apiError.response?.data?.message ||
          apiError.message ||
          "No se pudo conectar con el servidor";

        setErrorDialog({
          isOpen: true,
          title: "Error de Validación",
          message: mensajeError
        });
        setIsProcessing(false);
        return;
      }

      if (resultado.error !== 0) {
        console.error("❌ Error en respuesta de validación:", resultado);

        setErrorDialog({
          isOpen: true,
          title: "Validación Fallida",
          message: resultado.resultado || "No se pudo validar la biometría"
        });
        setIsProcessing(false);
        return;
      }

      const similitudPorcentaje = resultado.data?.[0]?.similitud || 0;

      if (similitudPorcentaje < 90) {
        setRecognitionScore(similitudPorcentaje.toFixed(2));
        setStep(6);
        setIsProcessing(false);
        return;
      }

      const reversoBase64 = localStorage.getItem(`fotoIneReverso_${id}`);
      const ocrAlmacenado = localStorage.getItem(`ocrData_${id}`);

      const comprimirAPNG = async (base64) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = base64;
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = 600;
              canvas.height = (600 * img.height) / img.width;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/png"));
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error("Error al cargar imagen"));
        });
      };

      let anversoPng, reversoPng, selfiePng;

      try {
        anversoPng = await comprimirAPNG(fotoIneFrontal);
        reversoPng = reversoBase64 ? await comprimirAPNG(reversoBase64) : "";
        selfiePng = await comprimirAPNG(selfieData);
      } catch (compressionError) {
        console.error("❌ Error al comprimir imágenes:", compressionError);

        setErrorDialog({
          isOpen: true,
          title: "Error de Procesamiento",
          message: "No se pudieron procesar las imágenes. Por favor, inténtalo de nuevo."
        });
        setIsProcessing(false);
        return;
      }

      const datosRegistro = {
        ocrResponse: ocrAlmacenado,
        biometricoResponse: JSON.stringify(resultado),
        ineAnversoPath: anversoPng,
        ineReversoPath: reversoPng,
        clientePath: selfiePng,
      };

      let registroRespuesta;

      try {
        registroRespuesta = await globalApi.registrarBiometricos(
          datosRegistro,
          id
        );
      } catch (registroError) {
        console.error("❌ Error en registrarBiometricos (catch):", registroError);

        const mensajeError =
          registroError.response?.data?.resultado ||
          registroError.response?.data?.message ||
          registroError.message ||
          "No se pudo completar el registro en la base de datos";

        setErrorDialog({
          isOpen: true,
          title: "Error en Base de Datos",
          message: mensajeError
        });
        setIsProcessing(false);
        return;
      }

      if (registroRespuesta?.error && registroRespuesta.error !== 0) {
        console.error("❌ Error en respuesta de registro:", registroRespuesta);

        const mensajeError =
          registroRespuesta.resultado ||
          registroRespuesta.message ||
          "Error al registrar datos";

        setErrorDialog({
          isOpen: true,
          title: "Error en Registro",
          message: mensajeError
        });
        setIsProcessing(false);
        return;
      }

      setRecognitionScore(similitudPorcentaje.toFixed(2));
      setStep(5);

    } catch (error) {
      console.error("❌ Error inesperado en validación:", error);

      setErrorDialog({
        isOpen: true,
        title: "Error Crítico",
        message: error.message || "Por favor, inténtalo de nuevo"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const reintentar = () => {
    setCapturedFace(null);
    setRecognitionScore(null);
    setLiveSimilarity(0);
    setStep(1);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const validationResult = validateLiveCaptureDetailed(canvas);

        if (!validationResult.isValid) {
          setErrorDialog({
            isOpen: true,
            title: "❌ Archivo no válido",
            message: validationResult.reason
          });
          return;
        }

        setCapturedFace(imageData);
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }
        setCameraActive(false);
        processValidation(imageData);
      };
      img.src = imageData;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#f0fafa" }}>
      <input
        type="file"
        id="file-upload-facial"
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />

      <main className="flex-1 relative flex items-center justify-center">
        {/* Cámara activa */}
        {step === 3 && (
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              autoPlay
              playsInline
              muted
            />

            {/* Badge de similitud */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10">
              <div
                className="backdrop-blur rounded-2xl px-8 py-4 shadow-2xl text-center"
                style={{ background: "rgba(255,255,255,0.93)" }}
              >
                <p className="font-medium mb-2" style={{ color: "#5a7a7a" }}>
                  Coincidencia con tu INE
                </p>
                <p className="text-4xl font-extrabold" style={{ color: "#1a2e2e" }}>
                  {liveSimilarity}%
                </p>
                {liveSimilarity >= 90 && (
                  <p
                    className="font-bold mt-3 animate-pulse"
                    style={{ color: "#56BDBC" }}
                  >
                    ¡Capturando automáticamente!
                  </p>
                )}
              </div>
            </div>

            {/* Controles */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4 w-full px-4">
              <div className="flex items-center gap-6">
                {/* Botón captura */}
                <button
                  onClick={capturePhoto}
                  disabled={!cameraActive}
                  className="w-20 h-20 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition disabled:opacity-50 border-4 border-white"
                  style={{ background: "linear-gradient(135deg, #56BDBC, #7CDC55)" }}
                >
                  <div className="w-14 h-14 bg-white rounded-full" />
                </button>

                {/* Botón galería */}
                <button
                  onClick={() => document.getElementById("file-upload-facial").click()}
                  className="flex items-center gap-2 backdrop-blur-md px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl border"
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    color: "#56BDBC",
                    borderColor: "#9DD9DC",
                  }}
                >
                  <Upload size={18} />
                  USAR GALERÍA
                </button>
              </div>

              <p
                className="text-center font-bold px-6 py-2 rounded-full shadow-sm backdrop-blur-sm text-sm uppercase tracking-wide"
                style={{ background: "rgba(255,255,255,0.92)", color: "#1a2e2e" }}
              >
                Captura rostro
              </p>
            </div>
          </div>
        )}

        {/* Modales */}
        {(step === 1 || step === 4 || step === 5 || step === 6) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ background: "#f0fafa" }}>
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">

              {/* Step 1 – Inicio */}
              {step === 1 && (
                <>
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: "linear-gradient(135deg, #D3F0DC, #9DD9DC)" }}
                  >
                    <Camera size={40} style={{ color: "#56BDBC" }} strokeWidth={1.8} />
                  </div>
                  <h2 className="text-2xl font-extrabold mb-4" style={{ color: "#1a2e2e" }}>
                    Verificación Facial
                  </h2>
                  <p className="text-base leading-relaxed mb-10" style={{ color: "#5a7a7a" }}>
                    Mira a la cámara. Se mostrará el porcentaje de coincidencia en tiempo real.
                  </p>
                  <button
                    onClick={requestCameraAccess}
                    disabled={isLoadingCamera}
                    className="w-full text-white font-bold py-4 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
                  >
                    {isLoadingCamera ? "Iniciando..." : "Comenzar"}
                  </button>
                </>
              )}

              {/* Step 4 – Procesando */}
              {step === 4 && (
                <div className="py-10">
                  <Loader2
                    className="w-20 h-20 animate-spin mx-auto mb-6"
                    style={{ color: "#56BDBC" }}
                  />
                  <h3 className="text-xl font-bold" style={{ color: "#1a2e2e" }}>
                    Procesando coincidencia final...
                  </h3>
                </div>
              )}

              {/* Step 5 – Éxito */}
              {step === 5 && (
                <>
                  <div className="relative inline-block mb-8">
                    <img
                      src={capturedFace}
                      alt="Selfie"
                      className="w-40 h-40 rounded-3xl object-cover shadow-xl"
                    />
                    <div
                      className="absolute -bottom-4 -right-4 rounded-2xl p-3 shadow-2xl"
                      style={{ background: "linear-gradient(135deg, #56BDBC, #7CDC55)" }}
                    >
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2" style={{ color: "#1a2e2e" }}>
                    ¡Coincidencia verificada!
                  </h2>
                  <p className="text-3xl font-extrabold mb-10" style={{ color: "#56BDBC" }}>
                    {recognitionScore}% de similitud
                  </p>
                  <button
                    onClick={() => {
                      markStepComplete(id, "reconocimiento");
                      navigate(`/vista/${id}`);
                    }}
                    className="w-full text-white font-bold py-5 rounded-2xl text-lg shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
                  >
                    CONTINUAR
                  </button>
                </>
              )}

              {/* Step 6 – Fallo */}
              {step === 6 && (
                <>
                  <div className="relative inline-block mb-8">
                    <img
                      src={capturedFace}
                      alt="Selfie"
                      className="w-40 h-40 rounded-3xl object-cover shadow-xl"
                    />
                    <div className="absolute -bottom-4 -right-4 bg-red-500 rounded-2xl p-3 shadow-2xl">
                      <AlertCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2" style={{ color: "#1a2e2e" }}>
                    Los rostros no coinciden
                  </h2>
                  <p className="text-2xl font-bold text-red-500 mb-3">
                    {recognitionScore}% de similitud
                  </p>
                  <p className="text-sm leading-relaxed mb-10" style={{ color: "#5a7a7a" }}>
                    Necesitamos al menos 90%. Intenta con mejor iluminación.
                  </p>
                  <button
                    onClick={reintentar}
                    className="w-full text-white font-bold py-5 rounded-2xl text-lg shadow-xl active:scale-95 transition flex items-center justify-center gap-3"
                    style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
                  >
                    <RotateCcw size={22} />
                    REINTENTAR
                  </button>
                </>
              )}

            </div>
          </div>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <AlertDialog
        open={errorDialog.isOpen}
        onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent className="bg-white rounded-3xl p-8 shadow-2xl max-w-[90vw] md:max-w-md">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#fff0f0" }}>
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-extrabold text-center" style={{ color: "#1a2e2e" }}>
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed" style={{ color: "#5a7a7a" }}>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction
              className="w-full text-white font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-all p-7"
              style={{ background: "linear-gradient(135deg, #56BDBC 0%, #7CDC55 100%)" }}
              onClick={() => {
                setErrorDialog({ isOpen: false, title: "", message: "" });
                reintentar();
              }}
            >
              Intentar de nuevo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}