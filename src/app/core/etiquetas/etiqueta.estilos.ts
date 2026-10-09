export const ANCHO_MM = 50;
export const ALTO_MM = 30;

export const ESTILOS_ETIQUETA = `
  @page { size: ${ANCHO_MM}mm ${ALTO_MM}mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { width: ${ANCHO_MM}mm; height: ${ALTO_MM}mm; }
  body {
    width: ${ANCHO_MM}mm;
    height: ${ALTO_MM}mm;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .banda {
    background: #000;
    color: #fff;
    padding: 1.1mm 1.8mm 1.4mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .banda .principal { font-size: 19pt; font-weight: 700; line-height: 1; letter-spacing: -.02em; white-space: nowrap; }
  .banda .lateral { display: flex; flex-direction: column; align-items: flex-end; }
  .banda .tienda { font-size: 10pt; font-weight: 700; line-height: 1.1; white-space: nowrap; }
  .banda .fecha {
    font-size: 8pt;
    line-height: 1.1;
    white-space: nowrap;
    border-top: .3mm solid #fff;
    padding-top: .5mm;
    margin-top: .5mm;
    width: 100%;
    text-align: right;
  }
  .banda .destino { font-size: 11pt; font-weight: 700; line-height: 1; white-space: nowrap; }
  .cuerpo {
    flex: 1;
    padding: 1.3mm 1.8mm;
    display: flex;
    flex-direction: column;
    gap: .7mm;
    overflow: hidden;
  }
  .fila { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
  .lid-medio { font-size: 11pt; font-weight: 700; line-height: 1; white-space: nowrap; }
  .meta { font-size: 8pt; line-height: 1; white-space: nowrap; }
  .modelo { font-size: 12pt; font-weight: 700; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .problema { font-size: 9.5pt; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .problema.tres { -webkit-line-clamp: 3; }
`;