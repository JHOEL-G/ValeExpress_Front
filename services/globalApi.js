/* eslint-disable no-unused-vars */
import axios from "axios";

const apiNegocio = axios.create({
  baseURL: "/api-negocio/api",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "99A7F0FCE91CECE2D52429D1243F2950",
  },
});

const apiServicios = axios.create({
  baseURL: "/api-servicios",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "96c9b926a6d3207d0bd1dda8d3e468bd1111111",
  },
});

[apiNegocio, apiServicios].forEach((api) => {
  api.interceptors.response.use(
    (response) => {
      if (
        response.data &&
        response.data.error !== undefined &&
        response.data.error !== 0
      ) {
        const dbError = {
          message: response.data.resultado || "Error de validación en BD",
          code: response.data.error,
          details: response.data.data,
          isDbError: true,
        };
        return Promise.reject(dbError);
      }
      return response;
    },
    (error) => {
      const errorResponse = {
        message:
          error.response?.data?.resultado ||
          error.response?.data?.message ||
          "Error de conexión",
        code: error.response?.data?.error || error.response?.status,
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
      };

      console.error("❌ ERROR DETALLADO:", errorResponse);

      return Promise.reject(errorResponse);
    }
  );
});

export const globalApi = {
  obtenerDetalleVale: async (referencia) => {
    const cleanRef = referencia.trim();
    const response = await apiNegocio.get(`/Vale/${cleanRef}`);
    return response;
  },

  registrarFormulario: (data) => {

    return apiNegocio.post("/Cliente/registro", data, {
      headers: {
        referencia: data.referencia,
      },
    });
  },

  procesarOCRFinal: async () => {
    const response = await apiServicios.post("/OCR/ocrValidacion");
    return response.data;
  },

  validarIdentidad: async (
    base64ImgFrontal,
    base64ImgReverso,
    referencia = "temp_ref"
  ) => {
    const payload = {
      proveedorId: 4,
      base64Img: base64ImgFrontal,
      base64ImgReverso: base64ImgReverso,
      referencia: String(referencia),
      cara: 2,
      validate: true,
    };
    const response = await apiServicios.post("/OCR/INE", payload);
    return response.data;
  },

  validarIneSelfie: async (
    base64IneFrontal,
    base64Selfie,
    referenciaId = "temp_ref"
  ) => {
    const payload = {
      credencial: base64IneFrontal,
      captura: base64Selfie,
      referenciaId: String(referenciaId),
    };

    try {
      const response = await apiServicios.post(
        "/Biometricos/v2/validarIneSelfie",
        payload
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error en biometría:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  consultarCP: (cp) => {
    return apiNegocio.get(`/Catalogos/asentamientos`, {
      params: { cp: cp },
    });
  },

  consultarParentescos: () => {
    return apiNegocio.get(`/Catalogos/parentescos`);
  },

  consultarBancos: () => {
    return apiNegocio.get(`/Catalogos/bancos`);
  },

  procesarOCR: (formData) => {
    return apiServicios.post(`/OCR/INE`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  obtenerDocumentoContrato: async (referencia) => {
    const cleanRef = referencia.trim();
    const tipoId = cleanRef.charAt(0);

    try {
      const response = await apiNegocio.get("/Solicitud/contrato/documento", {
        headers: {
          referencia: cleanRef,
          validacionTipoId: tipoId,
        },
      });

      const certificar = response.data?.data?.certificar ?? 0;
      const debeCertificar = certificar === -1 || certificar === 1;

      return {
        data: response.data.data,
        certificar: certificar,
        debeCertificar: debeCertificar,
        metadata: response.data,
        soloDatos: true,
      };
    } catch (error) {
      console.error("❌ Error en GET contrato:", error.message);
      throw error;
    }
  },

  firmarDocumento: async (datosParaFirmar) => {
    try {
      const response = await apiServicios.post(
        "/signDocument/firmarDocumentoNom151",
        datosParaFirmar
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error en firmarDocumentoNom151:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  registrarBiometricos: async (datos, referencia) => {
    try {
      const response = await apiNegocio.post(
        "/Cliente/biometricos/registro",
        datos,
        {
          headers: {
            "Content-Type": "application/json",
            usuarioId: "1",
            validacionTipoId: "1",
            referencia: String(referencia),
            referenciaId: String(referencia),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error en registrarBiometricos:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  obtenerUrlContratoFinal: async (
    referencia,
    payloadRegistro,
    usuarioId = "1"
  ) => {
    try {
      if (payloadRegistro.contratoFirma?.data?.[0]) {
        const data0 = payloadRegistro.contratoFirma.data[0];
      }

      const cleanRef = String(referencia).trim();
      const headers = {
        "Content-Type": "application/json",
        referencia: cleanRef,
        usuarioId: String(usuarioId),
        validacionTipoId: String(cleanRef.charAt(0)),
      };

      const response = await apiNegocio.post(
        "/Cliente/v2/contrato/registro",  // ← cambio aquí
        payloadRegistro,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Error en registro de contrato:", error.response?.data);

      if (error.response?.data) {
        console.error("\n🔴 DETALLES DEL ERROR 500:");
        console.error("- Status:", error.response.status);
        console.error("- Error code:", error.response.data.error);
        console.error("- Resultado:", error.response.data.resultado);
        console.error("- Data:", error.response.data.data);
      }

      throw error;
    }
  },

  obtenerPdfContrato: async (referencia) => {
    const cleanRef = referencia.trim();
    const tipoId = cleanRef.charAt(0);

    try {
      const response = await apiNegocio.get("/Solicitud/contrato/v3/doc", {
        headers: {
          validacionTipoId: tipoId,
          referencia: cleanRef,
        },
      });

      if (response.data.error !== 0) {
        throw new Error(response.data.resultado || "Error al obtener el PDF");
      }

      if (!response.data.data) {
        throw new Error("El servidor no devolvió el PDF");
      }

      return response.data.data;
    } catch (error) {
      console.error("❌ Error al obtener PDF:", error.message);
      throw error;
    }
  },
};
