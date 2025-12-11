// Structure: Key is the ATTACKER. Values are the DEFENDERS and the multiplier.
// 1x damage is omitted for efficiency.

const TYPE_CHART = {
  'Normal': { 'Roca': 0.5, 'Acero': 0.5, 'Fantasma': 0 },
  'Fuego': { 'Planta': 2, 'Hielo': 2, 'Bicho': 2, 'Acero': 2, 'Fuego': 0.5, 'Agua': 0.5, 'Roca': 0.5, 'Dragón': 0.5 },
  'Agua': { 'Fuego': 2, 'Tierra': 2, 'Roca': 2, 'Agua': 0.5, 'Planta': 0.5, 'Dragón': 0.5 },
  'Planta': { 'Agua': 2, 'Tierra': 2, 'Roca': 2, 'Planta': 0.5, 'Fuego': 0.5, 'Veneno': 0.5, 'Volador': 0.5, 'Bicho': 0.5, 'Dragón': 0.5, 'Acero': 0.5 },
  'Eléctrico': { 'Agua': 2, 'Volador': 2, 'Eléctrico': 0.5, 'Planta': 0.5, 'Dragón': 0.5, 'Tierra': 0 },
  'Hielo': { 'Planta': 2, 'Tierra': 2, 'Volador': 2, 'Dragón': 2, 'Fuego': 0.5, 'Agua': 0.5, 'Hielo': 0.5, 'Acero': 0.5 },
  'Lucha': { 'Normal': 2, 'Hielo': 2, 'Roca': 2, 'Siniestro': 2, 'Acero': 2, 'Veneno': 0.5, 'Volador': 0.5, 'Psíquico': 0.5, 'Bicho': 0.5, 'Fantasma': 0 },
  'Veneno': { 'Planta': 2, 'Veneno': 0.5, 'Tierra': 0.5, 'Roca': 0.5, 'Fantasma': 0.5, 'Acero': 0 },
  'Tierra': { 'Fuego': 2, 'Eléctrico': 2, 'Veneno': 2, 'Roca': 2, 'Acero': 2, 'Planta': 0.5, 'Bicho': 0.5, 'Volador': 0 },
  'Volador': { 'Planta': 2, 'Lucha': 2, 'Bicho': 2, 'Eléctrico': 0.5, 'Roca': 0.5, 'Acero': 0.5 },
  'Psíquico': { 'Lucha': 2, 'Veneno': 2, 'Psíquico': 0.5, 'Acero': 0.5, 'Siniestro': 0 },
  'Bicho': { 'Planta': 2, 'Psíquico': 2, 'Siniestro': 2, 'Fuego': 0.5, 'Lucha': 0.5, 'Veneno': 0.5, 'Volador': 0.5, 'Fantasma': 0.5, 'Acero': 0.5 },
  'Roca': { 'Fuego': 2, 'Hielo': 2, 'Volador': 2, 'Bicho': 2, 'Lucha': 0.5, 'Tierra': 0.5, 'Acero': 0.5 },
  'Fantasma': { 'Psíquico': 2, 'Fantasma': 2, 'Siniestro': 0.5, 'Acero': 0.5, 'Normal': 0 },
  'Dragón': { 'Dragón': 2, 'Acero': 0.5 },
  'Acero': { 'Hielo': 2, 'Roca': 2, 'Fuego': 0.5, 'Agua': 0.5, 'Eléctrico': 0.5, 'Acero': 0.5 },
  'Siniestro': { 'Psíquico': 2, 'Fantasma': 2, 'Lucha': 0.5, 'Siniestro': 0.5, 'Acero': 0.5 }
};