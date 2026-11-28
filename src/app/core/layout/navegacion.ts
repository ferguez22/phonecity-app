import { NombreIcono } from './icono/iconos';

export interface EnlaceNav {
  ruta: string;
  texto: string;
  corto: string;
  icono: NombreIcono;
  barra: boolean;
  movil: 'pestana' | 'mas';
  admin?: boolean;
}

export const ENLACES: EnlaceNav[] = [
  {
    ruta: '/tablero',
    texto: 'Tablero',
    corto: 'Tablero',
    icono: 'tablero',
    barra: true,
    movil: 'pestana',
  },
  {
    ruta: '/reparaciones',
    texto: 'Reparaciones',
    corto: 'Reparaciones',
    icono: 'reparaciones',
    barra: true,
    movil: 'pestana',
  },
  {
    ruta: '/clientes',
    texto: 'Clientes',
    corto: 'Clientes',
    icono: 'clientes',
    barra: true,
    movil: 'pestana',
  },
  {
    ruta: '/notas',
    texto: 'Notas',
    corto: 'Notas',
    icono: 'notas',
    barra: true,
    movil: 'mas',
  },
  {
    ruta: '/etiquetas',
    texto: 'Etiquetas',
    corto: 'Etiquetas',
    icono: 'etiqueta',
    barra: true,
    movil: 'mas',
  },
  {
    ruta: '/guia',
    texto: 'Guía rápida',
    corto: 'Guía',
    icono: 'ayuda',
    barra: false,
    movil: 'mas',
  },
  {
    ruta: '/importar',
    texto: 'Importar',
    corto: 'Importar',
    icono: 'importar',
    barra: false,
    movil: 'mas',
    admin: true,
  },
  {
    ruta: '/modelos/limpiar',
    texto: 'Limpiar modelos',
    corto: 'Modelos',
    icono: 'limpiar',
    barra: false,
    movil: 'mas',
    admin: true,
  },
  {
    ruta: '/estadisticas',
    texto: 'Estadísticas',
    corto: 'Estadísticas',
    icono: 'estadisticas',
    barra: true,
    movil: 'mas',
    admin: true,
  },
];
