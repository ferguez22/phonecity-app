// Envoltorio estandar de TODAS las respuestas de la API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { message: string; stack?: string } | null;
}
