import { NombreIcono } from './icono/iconos';

export interface EnlaceNav {
  ruta: string;
  texto: string;
  corto: string;
  icono: NombreIcono;
  barra: 'izquierda' | 'derecha';
  movil: 'pestana' | 'mas';
}

export const ENLACES: EnlaceNav[] = [
  {
    ruta: '/tablero',
    texto: 'Tablero',
    corto: 'Tablero',
    icono: 'tablero',
    barra: 'izquierda',
    movil: 'pestana',
  },
  {
    ruta: '/linea/nueva',
    texto: 'Nueva línea',
    corto: 'Nueva',
    icono: 'nueva',
    barra: 'izquierda',
    movil: 'pestana',
  },
  {
    ruta: '/reparaciones',
    texto: 'Reparaciones',
    corto: 'Reparaciones',
    icono: 'reparaciones',
    barra: 'izquierda',
    movil: 'pestana',
  },
  {
    ruta: '/clientes',
    texto: 'Clientes',
    corto: 'Clientes',
    icono: 'clientes',
    barra: 'izquierda',
    movil: 'pestana',
  },
  {
    ruta: '/notas',
    texto: 'Notas',
    corto: 'Notas',
    icono: 'notas',
    barra: 'izquierda',
    movil: 'mas',
  },
  {
    ruta: '/importar',
    texto: 'Importar',
    corto: 'Importar',
    icono: 'importar',
    barra: 'derecha',
    movil: 'mas',
  },
];
